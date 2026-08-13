import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export function useChat(param1, param2) {
  let listingId, otherUserId;
  if (typeof param1 === 'object' && param1 !== null) {
    listingId = param1.listingId;
    otherUserId = param1.receiverId || param1.otherUserId;
  } else {
    listingId = param1;
    otherUserId = param2;
  }

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (!listingId || !otherUserId) {
      throw new Error('Destinatário ou anúncio não identificados para envio de mensagem.');
    }

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
