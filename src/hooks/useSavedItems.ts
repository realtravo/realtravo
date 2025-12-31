import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  getLocalSavedItemIds, 
  saveItemLocally, 
  removeItemLocally, 
  getLocalSavedItems,
  clearLocalSavedItems 
} from "@/hooks/useLocalSavedItems";

export const useSavedItems = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const hasMergedRef = useRef(false);

  // Merge local saved items to database when user logs in
  const mergeLocalItemsToDatabase = async (userId: string) => {
    const localItems = getLocalSavedItems();
    if (localItems.length === 0) return;

    try {
      for (const item of localItems) {
        // Check if item already exists in database
        const { data: existing } = await supabase
          .from("saved_items")
          .select("id")
          .eq("item_id", item.item_id)
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!existing) {
          await supabase
            .from("saved_items")
            .insert([{ 
              user_id: userId, 
              item_id: item.item_id, 
              item_type: item.item_type
            }]);
        }
      }
      // Clear local items after successful merge
      clearLocalSavedItems();
    } catch (error) {
      console.error("Error merging local saved items:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      // For non-logged-in users, still track items locally but don't show in UI state
      // The local items are stored but hidden until login
      // Load local saved items to show the heart icon filled on cards
      const localIds = getLocalSavedItemIds();
      setSavedItems(localIds);
      setLoading(false);
      hasMergedRef.current = false;
      return;
    }

    // Initial fetch for logged-in users
    const fetchSavedItems = async () => {
      // Merge local items first if not already merged
      if (!hasMergedRef.current) {
        await mergeLocalItemsToDatabase(user.id);
        hasMergedRef.current = true;
      }

      const { data } = await supabase
        .from("saved_items")
        .select("item_id")
        .eq("user_id", user.id);
      
      if (data) {
        setSavedItems(new Set(data.map(item => item.item_id)));
      }
      setLoading(false);
    };

    fetchSavedItems();

    // Set up realtime subscription
    const channel = supabase
      .channel('saved-items-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_items',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = payload.new as { item_id: string };
          setSavedItems(prev => new Set([...prev, newItem.item_id]));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'saved_items',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedItem = payload.old as { item_id: string };
          setSavedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(deletedItem.item_id);
            return newSet;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSave = async (itemId: string, itemType: string) => {
    if (!user) {
      // Save locally for non-logged-in users
      const isLocalSaved = savedItems.has(itemId);
      
      if (isLocalSaved) {
        removeItemLocally(itemId);
        setSavedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        saveItemLocally(itemId, itemType);
        setSavedItems(prev => new Set([...prev, itemId]));
        toast({ 
          title: "Item saved", 
          description: "Log in to sync your saved items across devices"
        });
      }
      return;
    }
    
    const isSaved = savedItems.has(itemId);
    
    if (isSaved) {
      await supabase
        .from("saved_items")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", user.id);
    } else {
      // Check if item already exists in database
      const { data: existing } = await supabase
        .from("saved_items")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (!existing) {
        await supabase
          .from("saved_items")
          .insert([{ 
            user_id: user.id, 
            item_id: itemId, 
            item_type: itemType.toLowerCase()
          }]);
      }
    }
  };

  return { savedItems, loading, handleSave };
};
