import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export function useChat(listingId, otherUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listingId && otherUserId) {
      loadMessages();
    }
  }, [listingId, otherUserId]);

  async function loadMessages() {
    try {
      setLoading(true);
      const res = await fetchApi(`/chat/messages/${listingId}/${otherUserId}`);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text) {
    const res = await fetchApi('/chat/messages', {
      method: 'POST',
      body: {
        listing_id: listingId,
        receiver_id: otherUserId,
        message_text: text
      }
    });

    if (res.success) {
      setMessages((prev) => [...prev, res.data]);
    }
    return res;
  }

  return { messages, loading, sendMessage, refresh: loadMessages };
}
