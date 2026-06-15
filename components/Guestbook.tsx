'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Clock, LogIn, X } from 'lucide-react';

type Message = {
  id: string;
  username: string;
  content: string;
  created_at: string;
};

export function Guestbook() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [accountType, setAccountType] = useState<'java' | 'bedrock'>('java');
  const [modalError, setModalError] = useState('');

  // Format relative time concisely
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(collection(db, 'guestbook'), orderBy('created_at', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const fetchedMessages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at ? doc.data().created_at.toDate().toISOString() : new Date().toISOString()
        })) as Message[];
        setMessages(fetchedMessages);
        setError('');
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        if (err.message?.includes('Missing or insufficient permissions')) {
          setError("Note: Firebase configuration or rules may not be fully setup yet. Please try again later.");
        } else {
          setError('Could not load messages.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
    
    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as { java?: string, bedrock?: string };
            const name = data.java || data.bedrock || currentUser.email?.split('@')[0] || '';
            setUsername(name);
          } else {
             const name = currentUser.email?.split('@')[0] || '';
             setUsername(name);
          }
        } catch (err) {
          console.error("Error fetching username data", err);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !content.trim()) return;
    if (!user) {
      setError('You must be logged in to sign the guestbook!');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const docRef = await addDoc(collection(db, 'guestbook'), {
        username: username.trim(),
        content: content.trim(),
        created_at: serverTimestamp(),
        user_id: user.uid
      });
      
      setMessages([{
        id: docRef.id,
        username: username.trim(),
        content: content.trim(),
        created_at: new Date().toISOString()
      }, ...messages]);
      setContent('');
    } catch (err: any) {
      console.error('Error submitting message:', err);
      setError(err.message || 'Failed to post message. Make sure the database is initialized.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleLoginClick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        setError("Firebase Auth Error: Please add this domain to the authorized domains in Firebase Console (Authentication -> Settings -> Authorized domains).");
      } else {
        setError(`Login failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6">
        <h2 className="font-minecraft text-2xl md:text-3xl uppercase text-shadow-ore tracking-wider">Guestbook</h2>
        <p className="text-[#A0A0A0] font-sans">Leave a message for other players! Data stored in Firebase.</p>
      </div>

      <div className="ore-panel p-6 lg:p-8">
        <h3 className="font-minecraft text-xl lg:text-2xl mb-4 text-[#3BD03B] uppercase">Sign Guestbook</h3>
        {user ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Minecraft IGN</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Steve"
                className="ore-input px-4 py-3 font-sans w-full md:w-64"
                maxLength={16}
                disabled={submitting}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Message</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="This server is awesome!"
                className="ore-input px-4 py-3 font-sans w-full h-24 resize-none"
                maxLength={200}
                disabled={submitting}
                required
              />
            </div>
            
            {error && (
              <div className="text-sm text-[#ff5555] font-sans bg-[#ff5555]/10 border border-[#ff5555]/30 p-3 flex gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={submitting || !username.trim() || !content.trim()}
              className="ore-btn-primary self-end flex items-center gap-2 px-6 py-3"
            >
              {submitting ? 'SENDING...' : (
                <>
                  <Send className="w-5 h-5" /> POST MESSAGE
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-6 text-center">
            <p className="text-[#D0D0D0] font-sans text-lg">You must be logged in to sign the guestbook.</p>
            <button 
              onClick={handleLoginClick}
              className="ore-btn py-4 flex items-center gap-3 justify-center bg-[#318231] hover:bg-[#3BD03B] active:bg-[#1E1E1E] border-[#111] px-8"
            >
              <LogIn className="w-5 h-5" /> LOGIN TO ACCOUNT
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:gap-8">
        <h3 className="font-minecraft text-xl lg:text-2xl text-[#3BD03B] uppercase drop-shadow mt-4">Recent Entries</h3>
        
        {loading ? (
          <div className="ore-panel p-8 text-center text-[#A0A0A0] font-minecraft animate-pulse">
            LOADING ENTRIES...
          </div>
        ) : messages.length === 0 ? (
          <div className="ore-panel p-8 lg:p-12 text-center text-[#A0A0A0] font-sans">
            <p className="text-lg">No entries yet. Be the first to sign the guestbook!</p>
            <br />
            <span className="text-xs text-[#666] mt-2 block">(Note: Ensure your Firebase database has a &apos;guestbook&apos; collection)</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ore-panel p-5 lg:p-6 flex flex-col gap-3 transition-transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-center border-b border-[#313131] pb-3">
                    <span className="font-minecraft text-lg lg:text-xl text-white text-shadow-ore">{msg.username}</span>
                    <span className="text-xs lg:text-sm text-[#A0A0A0] font-sans flex items-center gap-1">
                      <Clock className="w-3 h-3 lg:w-4 lg:h-4" /> {timeAgo(msg.created_at)}
                    </span>
                  </div>
                  <p className="font-sans text-[#D0D0D0] text-sm lg:text-base break-words pt-1">{msg.content}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
