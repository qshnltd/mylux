'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Users, Globe, Play, Shield, Compass, BookOpen, Menu, X, ArrowRight, ShoppingCart, Star, HelpCircle, LogOut, LogIn, Map, Trophy, Calendar, Search, Terminal, Command, Settings, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Guestbook } from '@/components/Guestbook';
import Image from 'next/image';
import { auth, googleProvider, db } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AdminConsole } from '@/components/AdminConsole';
import { CustomSelect } from '@/components/CustomSelect';
import { parseMCColors, cleanMCColors } from '@/lib/utils';
import Link from 'next/link';

const defaultCommands = [
  {
    category: "General Utilities",
    description: "Basic commands available to all players for navigation and survival.",
    color: "#3BD03B",
    commands: [
      { cmd: "/spawn", desc: "Teleport to the main server spawn.", tags: "Everyone, Essentials, Server" },
      { cmd: "/sethome <name>", desc: "Set a home location to teleport to later.", tags: "Everyone, Essentials, Location" },
      { cmd: "/tpaccept", desc: "Accept an incoming teleport request.", tags: "Everyone, Essentials, Multiplayer" }
    ]
  }
];

const defaultTutorials = [
  {
    id: "tut-1",
    title: "How to Claim Land",
    category: "Lands (Protection)",
    color: "#ffaa00",
    tags: "Beginner, Protection",
    content: "1. Obtain a Golden Shovel.\n2. Right click the first corner of your desired land.\n3. Walk to the opposite corner and right click again.\n4. Use /trust <player> to allow friends to build."
  }
];

const getMcAvatarUrl = (name: string, uuid?: string, type: 'helm' | 'body' = 'helm', size: number = 24) => {
  const isBedrock = name && name.startsWith('.');
  if (uuid && uuid.startsWith("00000000-0000-0000-0009-")) {
      return `https://crafthead.net/${type}/${uuid}/${size}`;
  }
  if (uuid) return `https://crafthead.net/${type}/${uuid}/${size}`;
  return `https://crafthead.net/${type}/${name}/${size}`;
};

const defaultSiteConfig = {
  serverName: "Luxian Network",
  serverShortName: "MyLux",
  serverIp: "play.luxian.net",
  serverPort: "25565",
  discordUrl: "https://discord.gg/minecraft",
  storeUrl: "https://store.example.com",
  mapUrl: "http://map.example.com",
  homeWelcomeSub: "SMP Realm Is Live",
  homeWelcomeTitle: "Welcome to MyLux",
  homeWelcomeText: "Crossplay Survival Multiplayer featuring custom enchants, economy, and dynamic events. We started with a simple vision: to create a blocky paradise where the barriers between Java and Bedrock disappear.",
  commandsDescription: "A complete reference guide for essential in-game commands to survive and thrive on our network.",
  staffDescription: "The people who keep the network running smoothly.",
  mapDescription: "Explore the world in real-time.",
  playersDescription: "Look up player skins globally via Minotar and view live online players.",
  rulesTitle: "Rules & Guidelines",
  rulesDescription: "Keep it fair and fun for everyone.",
  rules: [
    { title: "No Cheating/Hacking", desc: "Using modded clients, X-Ray, or unapproved macros is strictly forbidden." },
    { title: "Be Respectful", desc: "No racism, sexism, excessive swearing, or harassment. We are a welcoming community." },
    { title: "No Griefing", desc: "Do not destroy or alter other players' builds without their explicit permission." },
    { title: "No Exploiting", desc: "Do not abuse server bugs or duplication glitches. Report them immediately." }
  ]
};

export default function Page() {
  const [data, setData] = useState<{ online: boolean; players: { online: number; max: number; list?: any[] }; motd: { clean: string[], html: string[] } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [adminTab, setAdminTab] = useState('console');
  const [isAdminView, setIsAdminView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mcAccounts, setMcAccounts] = useState<{ java?: string, bedrock?: string }>({});
  const [searchUsername, setSearchUsername] = useState('Steve');
  const [searchInput, setSearchInput] = useState('Steve');
  const [searchType, setSearchType] = useState<'java' | 'bedrock'>('java');
  const [managePlayerAction, setManagePlayerAction] = useState('kick');
  const [bedrockAvatar, setBedrockAvatar] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [commandsData, setCommandsData] = useState<any[]>([]);
  const [adminCommandsData, setAdminCommandsData] = useState<any[]>([]);
  const [isCommandsLoading, setIsCommandsLoading] = useState(true);
  const [isSavingCommands, setIsSavingCommands] = useState(false);
  const [commandsSearchQuery, setCommandsSearchQuery] = useState('');
  const [commandsFilter, setCommandsFilter] = useState('All');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const [tutorialsData, setTutorialsData] = useState<any[]>([]);
  const [adminTutorialsData, setAdminTutorialsData] = useState<any[]>([]);
  const [isTutorialsLoading, setIsTutorialsLoading] = useState(true);
  const [isSavingTutorials, setIsSavingTutorials] = useState(false);
  const [tutorialsSearchQuery, setTutorialsSearchQuery] = useState('');
  const [tutorialsFilter, setTutorialsFilter] = useState('All');
  const [expandedTutorialCategories, setExpandedTutorialCategories] = useState<string[]>([]);
  
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);
  const [adminSiteConfig, setAdminSiteConfig] = useState(defaultSiteConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [voteReminder, setVoteReminder] = useState(false);
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [notifiedEvents, setNotifiedEvents] = useState<Record<string, boolean>>({});

  const mockChartData = useMemo(() => {
    if (!playerStats) return [];
    return Array.from({length: 7}).map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const k = parseInt(playerStats.kills) || 0;
      const d = parseInt(playerStats.deaths) || 0;
      const indexModifier = (i * 13) % 7; 
      const kDaily = Math.floor(k / 7 * (0.8 + (indexModifier * 0.1)));
      const dDaily = Math.floor(d / 7 * (0.8 + (indexModifier * 0.1)));
      return {
        name: day.toLocaleDateString('en-US', { weekday: 'short' }),
        kills: Math.max(0, kDaily),
        deaths: Math.max(0, dDaily),
      };
    });
  }, [playerStats]);

  const SERVER_IP = siteConfig.serverIp;
  const SERVER_PORT = siteConfig.serverPort;

  const handleNotifyToggle = async (eventId: string) => {
    if (!user) {
      alert("Please login to save your notification preferences.");
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatedNotified = { ...notifiedEvents, [eventId]: !notifiedEvents[eventId] };
      await setDoc(userDocRef, { notifiedEvents: updatedNotified }, { merge: true });
      setNotifiedEvents(updatedNotified);
      
      if (updatedNotified[eventId]) {
          // Ask for browser notification permission
          if ("Notification" in window) {
              Notification.requestPermission();
          }
      }
    } catch (error) {
      console.error("Failed to save event notification:", error);
    }
  };

  const handleSaveCommands = async () => {
    setIsSavingCommands(true);
    try {
      await setDoc(doc(db, 'server_data', 'commands'), { groups: adminCommandsData });
      setCommandsData(adminCommandsData);
      setActionOutput("Commands saved successfully.");
    } catch(err: any) {
      setActionOutput("Failed to save commands: " + err.message);
    } finally {
      setIsSavingCommands(false);
    }
  };

  const handleSaveTutorials = async () => {
    setIsSavingTutorials(true);
    try {
      await setDoc(doc(db, 'server_data', 'tutorials'), { items: adminTutorialsData });
      setTutorialsData(adminTutorialsData);
      setActionOutput("Tutorials saved successfully.");
    } catch(err: any) {
      setActionOutput("Failed to save tutorials: " + err.message);
    } finally {
      setIsSavingTutorials(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'server_data', 'config'), adminSiteConfig);
      setSiteConfig(adminSiteConfig);
      setActionOutput("Configuration saved successfully.");
    } catch(err: any) {
      setActionOutput("Failed to save configuration: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
         const docRef = doc(db, 'server_data', 'commands');
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
           const data = docSnap.data().groups || [];
           setCommandsData(data);
           setAdminCommandsData(data);
           setExpandedCategories(data.map((_: any, i: number) => i)); 
         } else {
           setCommandsData(defaultCommands);
           setAdminCommandsData(defaultCommands);
           setExpandedCategories([0]); 
         }
       } catch (err) {
         setCommandsData(defaultCommands);
         setAdminCommandsData(defaultCommands);
         setExpandedCategories([0]);
       } finally {
         setIsCommandsLoading(false);
       }
       
       try {
         const tutRef = doc(db, 'server_data', 'tutorials');
         const tutSnap = await getDoc(tutRef);
         if (tutSnap.exists()) {
           const data = tutSnap.data().items || [];
           setTutorialsData(data);
           setAdminTutorialsData(data);
           const cats = Array.from(new Set(data.map((t: any) => t.category))) as string[];
           setExpandedTutorialCategories(cats);
         } else {
           setTutorialsData(defaultTutorials);
           setAdminTutorialsData(defaultTutorials);
           const cats = Array.from(new Set(defaultTutorials.map((t: any) => t.category))) as string[];
           setExpandedTutorialCategories(cats);
         }
       } catch (err) {
         setTutorialsData(defaultTutorials);
         setAdminTutorialsData(defaultTutorials);
       } finally {
         setIsTutorialsLoading(false);
       }
       try {
         const confRef = doc(db, 'server_data', 'config');
         const confSnap = await getDoc(confRef);
         if (confSnap.exists()) {
           const data = confSnap.data() as typeof defaultSiteConfig;
           setSiteConfig({ ...defaultSiteConfig, ...data });
           setAdminSiteConfig({ ...defaultSiteConfig, ...data });
         } else {
           setSiteConfig(defaultSiteConfig);
           setAdminSiteConfig(defaultSiteConfig);
         }
       } catch (err) {
         console.error(err);
         setSiteConfig(defaultSiteConfig);
         setAdminSiteConfig(defaultSiteConfig);
       }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'players' && !leaderboardData) {
      fetch('/api/stats/leaderboard').then(res => res.json()).then(data => {
        if (data.success && data.leaderboard) {
          setLeaderboardData(data.leaderboard);
        }
      }).catch(console.error);
    }
  }, [activeTab, leaderboardData]);

  useEffect(() => {
    // Session state
    const savedPwd = localStorage.getItem('mylux_rcon_pwd');
    const savedPort = localStorage.getItem('mylux_rcon_port');
    if (savedPwd) setRconAuthPassword(savedPwd);
    if (savedPort) setRconAuthPort(savedPort);
    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as { java?: string, bedrock?: string, voteReminder?: boolean, notifiedEvents?: Record<string, boolean> };
            setMcAccounts({ java: data.java, bedrock: data.bedrock });
            setVoteReminder(data.voteReminder || false);
            setNotifiedEvents(data.notifiedEvents || {});
            
            if (data.java || data.bedrock) {
               setRconTempGamertag(data.java || data.bedrock || '');
            }
            
            // Vote reminder logic - mock last voted to be >24h ago
            if (data.voteReminder) {
               const lastVoted = localStorage.getItem('mylux_last_voted');
               const now = Date.now();
               if (!lastVoted || now - parseInt(lastVoted) > 24 * 60 * 60 * 1000) {
                   setShowVoteToast(true);
                   setTimeout(() => setShowVoteToast(false), 10000);
               }
            }
          } else {
            // New user, show setup
            setModalMeta({ isOpen: true, type: 'setup', tempValue: '', accountType: 'java', error: '', voteRem: false });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setMcAccounts({});
        setRconTempGamertag('');
        setVoteReminder(false);
      }
    });

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/status`);
        if (!res.ok) throw new Error(`API fetch error: ${res.status}`);
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setData(json);
        } catch (jErr) {
          console.error("Invalid JSON from API:", text);
        }
      } catch (err) {
        console.error("Failed to fetch server status:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const [modalMeta, setModalMeta] = useState<{isOpen: boolean, type: 'login' | 'edit' | 'setup', tempValue: string, accountType: 'java' | 'bedrock', error?: string, voteRem?: boolean}>({ isOpen: false, type: 'login', tempValue: '', accountType: 'java', voteRem: false });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${SERVER_IP}:${SERVER_PORT}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginClick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("Firebase Auth Error: Please add this domain to the authorized domains in Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else {
        alert(`Login failed: ${error.message}`);
      }
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error('Guest login error:', error);
      alert(`Guest Login failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleEditNameClick = () => {
    const activeType = mcAccounts.java ? 'java' : 'bedrock';
    const activeName = activeType === 'java' ? mcAccounts.java : mcAccounts.bedrock?.substring(1);
    
    setModalMeta({ 
      isOpen: true, 
      type: 'edit', 
      tempValue: activeName || '', 
      accountType: activeType, 
      error: '',
      voteRem: voteReminder
    });
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalMeta((prev) => ({ ...prev, error: '' }));
    let name = modalMeta.tempValue.trim();
    if (name) {
      if (modalMeta.accountType === 'bedrock' && !name.startsWith('.')) {
        name = '.' + name;
      }
      
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const newAccounts = {
            ...mcAccounts,
            [modalMeta.accountType]: name
          };
          const newData = { ...newAccounts, voteReminder: modalMeta.voteRem };
          await setDoc(userDocRef, newData, { merge: true });
          setMcAccounts(newAccounts);
          setVoteReminder(modalMeta.voteRem || false);
          setModalMeta({ ...modalMeta, isOpen: false });
        } catch (error: any) {
          console.error('Setup error:', error);
          setModalMeta((prev) => ({ ...prev, error: error.message || 'Failed to save account' }));
        }
      }
    } else {
      setModalMeta((prev) => ({ ...prev, error: 'Username cannot be empty.' }));
    }
  };

  const [rconAuthPassword, setRconAuthPassword] = useState('');
  const [rconAuthPort, setRconAuthPort] = useState('26660');
  const [rconTempPassword, setRconTempPassword] = useState('');
  const [rconTempPort, setRconTempPort] = useState('26660');
  const [rconTempGamertag, setRconTempGamertag] = useState('');
  const [rconTempRank, setRconTempRank] = useState('Admin');
  const [rconAuthError, setRconAuthError] = useState('');
  const [isAuthenticatingRcon, setIsAuthenticatingRcon] = useState(false);
  const [livePlayersRcon, setLivePlayersRcon] = useState<{username: string, uuid?: string}[] | null>(null);

  const isAdmin = mcAccounts.java?.toLowerCase() === 'hanqishanmc' || mcAccounts.bedrock?.toLowerCase() === '.hanqishanmc';

  const fetchLivePlayers = async () => {
    try {
      const res = await fetch('/api/rcon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'list uuid', password: rconAuthPassword, port: rconAuthPort })
      });
      const d = await res.json();
      if (d.response) {
        let playersText = d.response.includes('online:') ? d.response.split('online:')[1] || '' : d.response;
        const rawPlayers = playersText.split(',').map((s: string)=>s.trim()).filter((s: string)=>s.length>0);
        const parsed = rawPlayers.map((p: string) => {
           const match = p.match(/(.+?)(?:\s*\((.*?)\))?$/);
           const uname = match ? match[1].trim() : p;
           return { username: uname, uuid: match && match[2] ? match[2].trim() : undefined }
        });
        setLivePlayersRcon(parsed);
      }
    } catch(err) { console.error(err); }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconTempPassword) return;
    setIsAuthenticatingRcon(true);
    setRconAuthError('');
    try {
      const res = await fetch('/api/rcon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'list', password: rconTempPassword, port: rconTempPort })
      });
      const d = await res.json();
      if (!res.ok) {
        setRconAuthError(d.error || 'Authentication Failed');
      } else {
        setRconAuthPassword(rconTempPassword);
        setRconAuthPort(rconTempPort);
        localStorage.setItem('mylux_rcon_pwd', rconTempPassword);
        localStorage.setItem('mylux_rcon_port', rconTempPort);
        setRconAuthError('');
      }
    } catch(err: any) {
      setRconAuthError('Network Error: ' + err.message);
    } finally {
      setIsAuthenticatingRcon(false);
    }
  };

  const adminNavItems = [
    { id: 'console', label: 'Server Console', icon: Terminal },
    { id: 'manage-config', label: 'Site Config', icon: Settings },
    { id: 'manage-players', label: 'Manage Players', icon: Users },
    { id: 'server-settings', label: 'Server Settings', icon: Shield },
    { id: 'manage-commands', label: 'Commands', icon: Command },
    { id: 'manage-tutorials', label: 'Tutorials', icon: BookOpen },
  ];

  const publicNavItems = [
    { id: 'home', label: 'Dashboard', icon: Compass },
    { id: 'players', label: 'Players & Stats', icon: Users },
    { id: 'events', label: 'Server Events', icon: Calendar },
    { id: 'commands', label: 'Commands', icon: Command },
    { id: 'tutorials', label: 'Tutorials', icon: HelpCircle },
    { id: 'store', label: 'Store', icon: ShoppingCart },
    { id: 'vote', label: 'Vote for Us', icon: Star },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'guestbook', label: 'Guestbook', icon: BookOpen },
    { id: 'staff', label: 'Staff Team', icon: Shield },
  ];



  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#1E1E1E] text-white font-sans overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#313131] border-b-2 border-[#111111] z-20">
        <h1 className="font-minecraft text-sm text-white text-shadow-ore tracking-widest uppercase">{siteConfig.serverShortName}</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-[#1E1E1E] border-2 border-[#111111] active:bg-[#111111]">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Menu) */}
      <div className={`
        fixed md:relative top-[60px] md:top-0 left-0 w-full md:w-64 lg:w-80 h-[calc(100vh-60px)] md:h-screen 
        bg-[#313131] border-r-2 border-[#111111] flex flex-col z-20 shadow-[inset_-1px_0_0_#464646]
        transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden md:block p-8 border-b-2 border-[#111111] shadow-[inset_0_-1px_0_#464646] bg-[#282828] text-center shrink-0">
          {/* Logo representation in OreUI block style */}
          <div className="mx-auto w-16 h-16 bg-[#318231] border-4 border-[#111111] shadow-[inset_0_3px_0_#4EC04E] mb-4 flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
             <span className="font-minecraft text-3xl font-bold drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">L</span>
          </div>
          <h1 className="font-minecraft text-xl sm:text-2xl lg:text-3xl text-white text-shadow-ore uppercase tracking-widest">{siteConfig.serverShortName}</h1>
          <p className="text-xs text-[#A0A0A0] mt-1 font-sans">{siteConfig.serverName}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3 custom-scrollbar">
          {isAdminView ? (
             <>
                {adminNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAdminTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative flex items-center gap-3 px-4 py-4 font-minecraft text-sm transition-colors text-left group ${
                      adminTab === item.id 
                        ? 'bg-[#1E1E1E] text-white border-2 border-[#111111] shadow-[inset_0_0_0_1px_#313131]' 
                        : 'text-[#D0D0D0] hover:bg-[#3C3C3C] hover:text-white border-2 border-transparent'
                    }`}
                  >
                    {adminTab === item.id && (
                      <div className="absolute left-[6px] w-[4px] h-6 bg-[#318231] rounded-[1px]" />
                    )}
                    <item.icon className="w-5 h-5 ml-2" />
                    <span className="flex-1">{item.label}</span>
                    {adminTab === item.id && <ArrowRight className="w-4 h-4 opacity-50" />}
                  </button>
                ))}
                
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => {
                      setIsAdminView(false);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-3 px-4 py-4 font-minecraft text-sm transition-colors text-left group text-[#ff5555] hover:bg-[#ff5555]/10 border-2 border-transparent`}
                  >
                    <ArrowRight className="w-5 h-5 ml-2 rotate-180" />
                    <span className="flex-1">Exit Dashboard</span>
                  </button>
                </div>
             </>
          ) : (
             <>
                {publicNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative flex items-center gap-3 px-4 py-4 font-minecraft text-sm transition-colors text-left group ${
                      activeTab === item.id 
                        ? 'bg-[#1E1E1E] text-white border-2 border-[#111111] shadow-[inset_0_0_0_1px_#313131]' 
                        : 'text-[#D0D0D0] hover:bg-[#3C3C3C] hover:text-white border-2 border-transparent'
                    }`}
                  >
                    {activeTab === item.id && (
                      <div className="absolute left-[6px] w-[4px] h-6 bg-[#318231] rounded-[1px]" />
                    )}
                    <item.icon className="w-5 h-5 ml-2" />
                    <span className="flex-1">{item.label}</span>
                    {activeTab === item.id && <ArrowRight className="w-4 h-4 opacity-50" />}
                  </button>
                ))}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsAdminView(true);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative flex items-center gap-3 px-4 py-4 font-minecraft text-sm transition-colors text-left group text-[#D0D0D0] hover:bg-[#3C3C3C] hover:text-white border-2 border-transparent`}
                  >
                    <Terminal className="w-5 h-5 ml-2" />
                    <span className="flex-1">Admin Dashboard</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </button>
                )}
             </>
          )}
        </div>
        
        {/* User Account / Login Section */}
        <div className="p-4 border-t-2 border-[#111111] bg-[#282828] flex flex-col gap-3">
           {user ? (
             <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3">
                 <div onClick={handleEditNameClick} title="Click to change avatar" className="cursor-pointer shrink-0">
                   <Image 
                     src={mcAccounts.java ? getMcAvatarUrl(mcAccounts.java, undefined, 'helm', 100) : (mcAccounts.bedrock ? getMcAvatarUrl('.' + mcAccounts.bedrock, undefined, 'helm', 100) : `https://minotar.net/cube/Steve/100.png`)} 
                     alt={mcAccounts.java || mcAccounts.bedrock || 'Steve'} 
                     width={40} height={40} 
                     className="bg-[#111] border-2 border-[#111] hover:border-[#3BD03B] transition-colors"
                     unoptimized
                     referrerPolicy="no-referrer"
                   />
                 </div>
                 <div className="flex flex-col flex-1 overflow-hidden" onClick={handleEditNameClick} title="Click to change username">
                   <span className="font-minecraft text-sm text-white truncate cursor-pointer hover:text-[#3BD03B]">{mcAccounts.java || mcAccounts.bedrock || 'Complete Setup'}</span>
                   <span className="text-[10px] text-[#A0A0A0] uppercase font-bold truncate">● Online</span>
                 </div>
                 <button onClick={handleLogout} className="p-2 hover:bg-[#ff5555] bg-[#3C3C3C] border-2 border-[#111] transition-colors" title="Logout">
                   <LogOut className="w-4 h-4 text-white" />
                 </button>
               </div>
             </div>
           ) : (
             <div className="flex flex-col gap-2">
               <button 
                 onClick={handleLoginClick}
                 className="ore-btn w-full py-3 flex items-center gap-2 justify-center bg-[#318231] hover:bg-[#3BD03B] active:bg-[#1E1E1E] border-[#111]"
               >
                 <LogIn className="w-4 h-4" /> GOOGLE LOGIN
               </button>
               {/* Guest Login Removed */}
             </div>
           )}
        </div>

        {/* Play Now Button at bottom of sidebar */}
        <div className="p-4 border-t-2 border-[#111111] shadow-[inset_0_1px_0_#464646] bg-[#282828] shrink-0">
           <button 
             onClick={() => {
               setActiveTab('play');
               setMobileMenuOpen(false);
             }}
             className="ore-btn-primary w-full py-4 text-base tracking-widest flex items-center gap-2 justify-center"
           >
             <Play className="w-5 h-5 fill-current" /> PLAY NOW
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#1E1E1E] flex flex-col h-[calc(100vh-60px)] md:h-screen overflow-y-auto relative p-3 md:p-8 lg:p-12">
        <div className="max-w-5xl mx-auto w-full pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAdminView ? `admin-${adminTab}` : activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4 sm:gap-8"
            >
              {!isAdminView && activeTab === 'home' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Dashboard</h2>
                    <p className="text-[#A0A0A0] font-sans">Server status and connection details.</p>
                  </div>

                  <div className="flex flex-col gap-4 sm:gap-6 lg:gap-4 sm:gap-8">
                    
                    {/* Welcome CTA Panel Component */}
                    <div className="ore-panel-light p-5 sm:p-8 lg:p-10 flex flex-col md:flex-row gap-6 sm:gap-4 sm:gap-8 relative overflow-hidden group items-center">
                      <div className="absolute top-[-50%] right-[-10%] w-64 h-64 sm:w-96 sm:h-96 bg-[#318231] rounded-full blur-[120px] opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-700 ease-in-out" />
                      <div className="flex-1 flex flex-col gap-3 sm:gap-4 z-10 w-full text-center md:text-left">
                         <span className="font-minecraft text-[#4EC04E] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] uppercase tracking-widest text-[10px] md:text-xs">{siteConfig.homeWelcomeSub}</span>
                         <h3 className="font-minecraft text-2xl sm:text-3xl md:text-3xl sm:text-4xl lg:text-5xl text-shadow-ore uppercase leading-tight break-words">{siteConfig.homeWelcomeTitle}</h3>
                         <p className="text-[#D0D0D0] leading-relaxed font-sans text-sm md:text-base max-w-2xl mt-[-4px] break-words">{siteConfig.homeWelcomeText}</p>
                         
                         {data?.motd?.html && (
                           <div className="bg-[#1E1E1E] border-2 border-[#111111] p-3 sm:p-4 inline-block self-center md:self-start shadow-[inset_0_0_0_1px_#313131] max-w-full overflow-x-auto custom-scrollbar">
                             <div className="font-minecraft text-xs sm:text-sm whitespace-nowrap" dangerouslySetInnerHTML={{ __html: data.motd.html.join('<br />') }} />
                           </div>
                         )}

                      </div>
                    </div>

                    {/* Status Panel Component */}
                    <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-4 sm:gap-8">
                      <div className="flex justify-between items-center">
                        <span className="font-minecraft text-lg lg:text-xl uppercase text-shadow-ore">Server Status</span>
                        {loading ? (
                          <span className="font-minecraft text-[#A0A0A0] text-sm flex items-center gap-2 bg-[#1e1e1e] border border-[#111] px-3 py-1.5 shadow-[inset_0_0_0_1px_#333]">
                            <span className="w-2.5 h-2.5 bg-[#A0A0A0] animate-ping shadow-[0_0_0_1px_#111111]" /> PINGING
                          </span>
                        ) : data?.online ? (
                          <span className="font-minecraft text-[#3BD03B] text-sm flex items-center gap-2 bg-[#1e1e1e] border border-[#111] px-3 py-1.5 shadow-[inset_0_0_0_1px_#333]">
                            <span className="w-2.5 h-2.5 bg-[#318231] border border-[#111]" /> ONLINE
                          </span>
                        ) : (
                          <span className="font-minecraft text-[#ff5555] text-sm flex items-center gap-2 bg-[#1e1e1e] border border-[#111] px-3 py-1.5 shadow-[inset_0_0_0_1px_#333]">
                            <span className="w-2.5 h-2.5 bg-[#ff0000] border border-[#111]" /> OFFLINE
                          </span>
                        )}
                      </div>

                      <div className="h-[2px] bg-[#111111] border-b border-[#464646]" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-4 sm:gap-8">
                        <div className="flex flex-col gap-2 col-span-2 md:col-span-1 border-b border-[#313131] md:border-b-0 pb-4 md:pb-0 md:border-r md:pr-4">
                          <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-wider">Players</span>
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-[#3BD03B]" />
                            <span className="text-xl lg:text-2xl font-minecraft text-shadow-ore">
                              {data?.players?.online || 0} <span className="text-sm text-[#666]">/ {data?.players?.max || 20}</span>
                            </span>
                          </div>
                          {data?.players?.max && (
                            <div className="w-full bg-[#111] h-2 mt-1 border border-[#1E1E1E]">
                               <div className="bg-[#3BD03B] h-full transition-all duration-500 ease-out" style={{ width: `${Math.min(100, Math.round((data.players.online / data.players.max) * 100))}%` }} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 border-b border-[#313131] md:border-b-0 pb-4 md:pb-0 md:border-r md:px-4">
                          <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-wider">Gamemode</span>
                          <span className="text-lg lg:text-xl font-minecraft text-shadow-ore text-white">Survival</span>
                        </div>
                        
                        <div className="flex flex-col gap-2 md:border-r border-[#313131] md:px-4">
                          <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-wider">Version</span>
                          <span className="text-lg lg:text-xl font-minecraft text-shadow-ore text-white">1.20+</span>
                        </div>
                        
                        <div className="flex flex-col gap-2 md:px-4">
                          <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-wider">Ping</span>
                          <span className="text-lg lg:text-xl font-minecraft text-shadow-ore text-[#3BD03B]">24ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Players List Component */}
                    {(((data?.players?.list?.length) || 0) > 0 || (data?.players?.online || 0) > 0) && (
                      <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-[#313131] pb-2">
                           <h3 className="font-minecraft text-xl text-white text-shadow-ore">Active Players</h3>
                        </div>
                        {((data?.players?.list?.length) || 0) > 0 ? (
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                             {data?.players?.list?.map((player: any) => {
                               const playerName = typeof player === 'string' ? player : player.name;
                               const cleanName = cleanMCColors(playerName);
                               const isBedrockPlayer = cleanName.startsWith('.');
                               return (
                               <div key={playerName} className="bg-[#1E1E1E] border border-[#111] p-3 text-center flex items-center gap-3">
                                  <Image src={getMcAvatarUrl(cleanName, undefined, 'helm', 24)} width={24} height={24} alt={cleanName} unoptimized referrerPolicy="no-referrer" />
                                  <span className="font-sans text-sm truncate" dangerouslySetInnerHTML={{ __html: parseMCColors(playerName) }} />
                               </div>
                               );
                             })}
                           </div>
                        ) : (
                           <p className="text-[#A0A0A0] font-sans text-sm">Active player names are hidden by the server. Only Player Count ({data?.players?.online}) is visible via Status Ping.</p>
                        )}
                      </div>
                    )}

                    {/* Server IP Copy section (Replaced by Integrated How to Play) */}
                    <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2 mt-4">
                      <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">How to Connect</h2>
                      <p className="text-[#A0A0A0] font-sans">Joining {siteConfig.serverShortName} from your device.</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-4 sm:gap-8 items-stretch">
                      <div className="ore-panel p-4 sm:p-6 lg:p-8 flex-1 w-full flex flex-col">
                        <h3 className="font-minecraft text-xl lg:text-2xl mb-4 text-[#3BD03B] uppercase border-b-2 border-[#1E1E1E] pb-2 inline-block self-start">Bedrock Edition</h3>
                        <p className="text-sm lg:text-base text-[#A0A0A0] mb-6">(Mobile, Console & Windows 10)</p>
                        
                        <a href={`minecraft://?addExternalServer=${siteConfig.serverShortName}|${SERVER_IP}:${SERVER_PORT}`} className="ore-btn-primary flex items-center justify-center gap-2 mb-8 text-sm md:text-base w-full md:w-auto md:inline-flex px-4 sm:px-8 py-3 sm:py-4">
                          <Play className="w-6 h-6 fill-current" /> CLICK TO ADD SERVER
                        </a>

                        <div className="bg-[#1E1E1E] border border-[#111] p-4 flex flex-col gap-2 mb-6 shadow-[inset_0_0_0_1px_#313131]">
                            <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Connect Address (IP)</span>
                            <div className="font-sans font-bold text-lg select-all text-white px-2 mt-1">{SERVER_IP}</div>
                            <div className="h-[1px] bg-[#313131] my-2 mx-2" />
                            <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest mt-1">Bedrock Port</span>
                            <div className="font-sans font-bold text-lg text-[#3BD03B] px-2 mt-1">{SERVER_PORT}</div>
                        </div>

                        <ol className="list-decimal pl-5 flex flex-col gap-3 text-[#D0D0D0] font-sans text-sm lg:text-base mt-2">
                          <li>Open Minecraft and click <strong className="text-white">Play</strong>.</li>
                          <li>Navigate to the <strong className="text-white">Servers</strong> tab.</li>
                          <li>Scroll down to the bottom and tap <strong className="text-white">Add Server</strong>.</li>
                          <li>Enter the IP and Port details above.</li>
                          <li>Click <strong className="text-white">Save</strong> and then <strong className="text-white">Join Server</strong>!</li>
                        </ol>
                      </div>

                      <div className="ore-panel p-4 sm:p-6 lg:p-8 flex-1 w-full relative flex flex-col">
                        <h3 className="font-minecraft text-xl lg:text-2xl mb-4 text-[#3BD03B] uppercase border-b-2 border-[#1E1E1E] pb-2 inline-block self-start">Java Edition</h3>
                        <p className="text-sm lg:text-base text-[#A0A0A0] mb-8">(PC / Mac)</p>
                        
                        <div className="bg-[#1E1E1E] border border-[#111] p-4 flex items-center justify-between gap-2 mb-6 shadow-[inset_0_0_0_1px_#313131]">
                            <div className="flex flex-col gap-2">
                                <span className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Connect Address (IP)</span>
                                <div className="font-sans font-bold text-lg select-all text-white px-2 mt-1">{SERVER_IP}</div>
                            </div>
                            <button onClick={copyToClipboard} className={`px-4 py-3 h-auto text-xs ${copied ? 'ore-btn-primary' : 'ore-btn'}`}>
                                {copied ? 'COPIED' : <Copy className="w-5 h-5 mx-auto" />}
                            </button>
                        </div>

                        <ol className="list-decimal pl-5 flex flex-col gap-3 text-[#D0D0D0] font-sans text-sm lg:text-base mt-auto lg:mt-2">
                          <li>Open Minecraft Java and click <strong className="text-white">Multiplayer</strong>.</li>
                          <li>Click <strong className="text-white">Add Server</strong> at the bottom.</li>
                          <li>Enter Server Name: <strong className="text-white">{siteConfig.serverShortName}</strong></li>
                          <li>Enter Server Address: <strong className="text-[#3BD03B]">{SERVER_IP}</strong></li>
                          <li>Click <strong className="text-white">Done</strong> and double-click to join!</li>
                        </ol>
                      </div>
                    </div>

                    {/* Integrated Rules Section */}
                    <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2 mt-4">
                      <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">{siteConfig.rulesTitle || "Server Rules"}</h2>
                      <p className="text-[#A0A0A0] font-sans">{siteConfig.rulesDescription || "Please read and abide by the server rules."}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                      {(siteConfig.rules || []).map((rule: any, idx: number) => (
                        <div key={idx} className="ore-panel p-4 sm:p-6 flex flex-col gap-3 transition-colors hover:border-[#333]">
                          <h3 className="font-minecraft text-lg lg:text-xl text-[#3BD03B] uppercase drop-shadow text-shadow-ore mt-1">
                            {idx + 1}. {rule.title}
                          </h3>
                          <p className="text-[#D0D0D0] text-sm leading-relaxed font-sans">{rule.desc}</p>
                        </div>
                      ))}
                    </div>

                  </div>
                </>
              )}







              {!isAdminView && activeTab === 'players' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Players & Stats</h2>
                    <p className="text-[#A0A0A0] font-sans">{siteConfig.playersDescription} <span className="text-[#ffaa00]">Note: GameDig Query has been enabled. The leaderboard will dynamically map real active players connected to the server. Advanced plugin stats will display once the MySQL database begins populating.</span></p>
                  </div>
                  
                  <div className="flex flex-col gap-6 mb-8 group">
                    <form className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-6" onSubmit={async (e) => {
                      e.preventDefault();
                      let query = searchInput.trim();
                      if (!query) return;
                      let currentType = searchType;
                      let cleanXboxQuery = query;
                      if (query.startsWith('.') || query.startsWith('*')) {
                        cleanXboxQuery = query.substring(1);
                        currentType = 'bedrock';
                        setSearchType('bedrock');
                      }
                      
                      const finalQuery = (currentType === 'bedrock' && !query.startsWith('.')) ? '.' + query : query;
                      setSearchUsername(finalQuery || 'Steve');
                      setBedrockAvatar('');
                      setIsSearching(true);
                      
                      if (currentType === 'bedrock') {
                          try {
                              const res = await fetch(`https://playerdb.co/api/player/xbox/${cleanXboxQuery}`);
                              const data = await res.json();
                              if (data.code === 'player.found' && data.data?.player?.avatar) {
                                  setBedrockAvatar(data.data.player.avatar);
                              } else if (data.success && data.data?.player?.avatar) {
                                  setBedrockAvatar(data.data.player.avatar);
                              } else {
                                  setBedrockAvatar(getMcAvatarUrl(finalQuery, undefined, 'body', 150));
                              }
                          } catch (err) {
                              setBedrockAvatar(getMcAvatarUrl(finalQuery, undefined, 'body', 150));
                          }
                      }
                      
                      try {
                          const statsRes = await fetch(`/api/stats/player?username=${encodeURIComponent(finalQuery)}`);
                          const statsData = await statsRes.json();
                          if (statsData.success) {
                              setPlayerStats(statsData.stats);
                          } else {
                              setPlayerStats(null);
                          }
                      } catch (err) {
                          console.error("Stats error", err);
                      }
                      
                      setIsSearching(false);
                    }}>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-2 relative">
                           <div className="flex justify-between items-center">
                             <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Player Search</label>
                             <div className="flex gap-2">
                               <button type="button" onClick={() => setSearchType('java')} className={`text-[10px] uppercase font-minecraft px-2 flex items-center transition-colors ${searchType === 'java' ? 'text-[#3BD03B]' : 'text-[#666] hover:text-[#A0A0A0]'}`}>Java</button>
                               <button type="button" onClick={() => setSearchType('bedrock')} className={`text-[10px] uppercase font-minecraft px-2 flex items-center transition-colors ${searchType === 'bedrock' ? 'text-[#3BD03B]' : 'text-[#666] hover:text-[#A0A0A0]'}`}>Bedrock</button>
                             </div>
                           </div>
                           <div className="relative">
                             {searchType === 'bedrock' && (
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] font-sans font-bold">.</span>
                             )}
                             <input 
                               name="username" 
                               type="text" 
                               value={searchInput}
                               onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.startsWith('.')) {
                                    setSearchType('bedrock');
                                    setSearchInput(val.substring(1));
                                  } else {
                                    setSearchInput(val);
                                  }
                               }}
                               className={`ore-input py-3 font-sans w-full transition-all ${searchType === 'bedrock' ? 'pl-8 pr-4' : 'px-4'}`} 
                               placeholder={searchType === 'bedrock' ? "BedrockPlayer" : "Notch"} 
                             />
                           </div>
                        </div>
                        <button type="submit" className="ore-btn-primary self-end md:self-auto py-3 px-8 flex items-center gap-2 justify-center h-12 mt-auto">
                          <Search className="w-5 h-5" /> SEARCH
                        </button>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-4 sm:gap-8">
                       <div className="ore-panel p-5 mx-2 sm:mx-0 sm:p-8 md:col-span-1 flex flex-col gap-6 items-center text-center justify-center relative overflow-hidden group">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#318231] rounded-full blur-[80px] opacity-20 -z-10 group-hover:opacity-40 transition-opacity" />
                          <div className="relative">
                            {isSearching && (
                               <div className="absolute inset-0 bg-[#111111]/80 z-10 flex items-center justify-center rounded">
                                  <div className="w-8 h-8 border-4 border-[#3BD03B] border-t-transparent rounded-full animate-spin"></div>
                               </div>
                            )}
                            <Image src={getMcAvatarUrl(searchUsername, playerStats?.uuid, 'body', 150)} alt={searchUsername} width={150} height={300} className={`${searchType === 'bedrock' ? "drop-shadow-2xl rounded-lg border-4 border-[#3BD03B] aspect-square object-cover" : "drop-shadow-2xl"} ${isSearching ? "opacity-50" : "opacity-100"} transition-opacity min-h-[150px] min-w-[150px]`} unoptimized referrerPolicy="no-referrer" />
                          </div>
                          
                          {searchType === 'bedrock' && <span className="bg-[#464646] tracking-widest text-[#A0A0A0] font-minecraft px-3 py-1 text-[10px] uppercase shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]">Bedrock Player</span>}
                          
                          <h3 className="font-minecraft text-2xl text-shadow-ore truncate w-full">{searchUsername}</h3>
                          <span className="bg-[#ffaa00] text-[#111] font-minecraft px-3 py-1 text-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)] uppercase">{playerStats?.rank || 'Player'}</span>
                       </div>
                       
                       <div className="md:col-span-2 flex flex-col gap-6">
                          <div className="ore-panel p-4 sm:p-6 flex flex-col gap-6">
                             <h3 className="font-minecraft text-xl text-[#3BD03B] border-b border-[#313131] pb-2">Statistics</h3>
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default hover:border-[#3BD03B] transition-colors">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Kills</span>
                                  <span className="font-minecraft text-xl text-white group-hover:text-[#3BD03B] transition-colors">{playerStats?.kills || '0'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default hover:border-[#ff5555] transition-colors">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Deaths</span>
                                  <span className="font-minecraft text-xl text-white group-hover:text-[#ff5555] transition-colors">{playerStats?.deaths || '0'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default hover:border-[#55ffff] transition-colors">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Playtime</span>
                                  <span className="font-minecraft text-xl text-white group-hover:text-[#55ffff] transition-colors">{playerStats?.playtime || '0 hrs'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default hover:border-[#ffaa00] transition-colors">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Clan</span>
                                  <span className="font-minecraft text-xl text-white group-hover:text-[#ffaa00] transition-colors">{playerStats?.clan || 'None'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default hover:border-[#ff55ff] transition-colors">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Aura Level</span>
                                  <span className="font-minecraft text-xl text-white group-hover:text-[#ff55ff] transition-colors">{playerStats?.level || '0'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333] flex flex-col gap-1 text-center group cursor-default text-[#A0A0A0]">
                                  <span className="font-minecraft text-[#666] text-xs uppercase">Status</span>
                                  <span className={`font-minecraft text-xl ${playerStats?.online ? 'text-[#3BD03B]' : 'text-[#666]'}`}>{playerStats?.online ? 'Online' : 'Offline'}</span>
                                </div>
                             </div>
                             {playerStats && (
                                <div className="mt-4 border-t border-[#313131] pt-6 flex flex-col gap-4">
                                  <h4 className="font-minecraft text-[#A0A0A0] text-sm uppercase tracking-widest">7-Day Activity History</h4>
                                  <div className="h-64 w-full bg-[#111] p-4 border border-[#111] shadow-[inset_0_0_0_1px_#333]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={mockChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" stroke="#666" tick={{ fill: '#A0A0A0', fontSize: 12, fontFamily: 'monospace' }} />
                                        <YAxis stroke="#666" tick={{ fill: '#A0A0A0', fontSize: 12, fontFamily: 'monospace' }} allowDecimals={false} />
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', fontFamily: 'monospace' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#A0A0A0' }} />
                                        <Line type="monotone" dataKey="kills" name="Kills" stroke="#3BD03B" strokeWidth={2} dot={{ fill: '#3BD03B', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="deaths" name="Deaths" stroke="#ff5555" strokeWidth={2} dot={{ fill: '#ff5555', strokeWidth: 2 }} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-4 sm:gap-8 border-t-2 border-[#313131] pt-8">
                    {leaderboardData?.playtime?.length > 0 && (
                      <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                        <h3 className="font-minecraft text-xl text-[#55ffff] border-b border-[#313131] pb-2">Top Playtime</h3>
                        <div className="flex flex-col gap-3">
                          {leaderboardData.playtime.map((item: any, i: number) => (
                            <div key={item.username} className="flex items-center justify-between group cursor-default hover:bg-[#1E1E1E] p-1 -m-1 rounded">
                              <div className="flex items-center gap-3">
                                <span className="font-minecraft text-[#666] w-5 text-right">{i + 1}.</span>
                                <Image src={getMcAvatarUrl(item.username, item.uuid, 'helm', 24)} width={24} height={24} alt={item.username} className="bg-[#111] rounded-sm" unoptimized referrerPolicy="no-referrer" />
                                <span className="font-minecraft text-white group-hover:text-[#3BD03B] transition-colors text-sm md:text-base">{item.username}</span>
                              </div>
                              <span className="font-sans text-[#A0A0A0] text-[10px] bg-[#1E1E1E] shadow-[inset_0_0_0_1px_#313131] px-2 py-1">{Math.round(item.stat / 1000 / 60 / 60).toLocaleString()} hrs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {leaderboardData?.kills?.length > 0 && (
                      <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                        <h3 className="font-minecraft text-xl text-[#ff5555] border-b border-[#313131] pb-2">Top Kills</h3>
                        <div className="flex flex-col gap-3">
                          {leaderboardData.kills.map((item: any, i: number) => (
                            <div key={item.username} className="flex items-center justify-between group cursor-default hover:bg-[#1E1E1E] p-1 -m-1 rounded">
                              <div className="flex items-center gap-3">
                                <span className="font-minecraft text-[#666] w-5 text-right">{i + 1}.</span>
                                <Image src={getMcAvatarUrl(item.username, item.uuid, 'helm', 24)} width={24} height={24} alt={item.username} className="bg-[#111] rounded-sm" unoptimized referrerPolicy="no-referrer" />
                                <span className="font-minecraft text-white group-hover:text-[#3BD03B] transition-colors text-sm md:text-base">{item.username}</span>
                              </div>
                              <span className="font-sans text-[#ff5555] text-[10px] bg-[#1E1E1E] shadow-[inset_0_0_0_1px_#422] px-2 py-1">{Number(item.stat).toLocaleString()} ⚔</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {leaderboardData?.skills?.length > 0 && (
                      <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                        <h3 className="font-minecraft text-xl text-[#ff55ff] border-b border-[#313131] pb-2">Top Aura Skills</h3>
                        <div className="flex flex-col gap-3">
                          {leaderboardData.skills.map((item: any, i: number) => (
                            <div key={item.username} className="flex items-center justify-between group cursor-default hover:bg-[#1E1E1E] p-1 -m-1 rounded">
                              <div className="flex items-center gap-3">
                                <span className="font-minecraft text-[#666] w-5 text-right">{i + 1}.</span>
                                <Image src={getMcAvatarUrl(item.username, item.uuid, 'helm', 24)} width={24} height={24} alt={item.username} className="bg-[#111] rounded-sm" unoptimized referrerPolicy="no-referrer" />
                                <span className="font-minecraft text-white group-hover:text-[#3BD03B] transition-colors text-sm md:text-base">{item.username}</span>
                              </div>
                              <span className="font-sans text-[10px] text-[#ff55ff] bg-[#1E1E1E] shadow-[inset_0_0_0_1px_#424] px-2 py-1">Lvl {Number(item.stat).toLocaleString()} 🌟</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {leaderboardData?.clans?.length > 0 && (
                      <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                        <h3 className="font-minecraft text-xl text-[#ffaa00] border-b border-[#313131] pb-2">Top Clans</h3>
                        <div className="flex flex-col gap-3">
                          {leaderboardData.clans.map((item: any, i: number) => (
                            <div key={item.username} className="flex items-center justify-between group cursor-default hover:bg-[#1E1E1E] p-1 -m-1 rounded">
                              <div className="flex items-center gap-3">
                                <span className="font-minecraft text-[#666] w-5 text-right">{i + 1}.</span>
                                <span className="font-minecraft text-[#ffaa00] text-lg">🛡</span>
                                <span className="font-minecraft text-white group-hover:text-[#3BD03B] transition-colors text-sm md:text-base">{item.username}</span>
                              </div>
                              <span className="font-sans text-[10px] text-[#ffaa00] bg-[#1E1E1E] shadow-[inset_0_0_0_1px_#443] px-2 py-1 uppercase">Lvl {item.stat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {leaderboardData?.general?.length > 0 && (
                      <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
                        <h3 className="font-minecraft text-xl text-[#55ffff] border-b border-[#313131] pb-2">Active Players</h3>
                        <div className="flex flex-col gap-3">
                          {leaderboardData.general.map((item: any, i: number) => (
                            <div key={item.username} className="flex items-center justify-between group cursor-default hover:bg-[#1E1E1E] p-1 -m-1 rounded">
                              <div className="flex items-center gap-3">
                                <span className="font-minecraft text-[#666] w-5 text-right">{i + 1}.</span>
                                <Image src={getMcAvatarUrl(item.username, item.uuid, 'helm', 24)} width={24} height={24} alt={item.username} className="bg-[#111] rounded-sm" unoptimized referrerPolicy="no-referrer" />
                                <span className="font-minecraft text-white group-hover:text-[#3BD03B] transition-colors text-sm md:text-base">{item.username}</span>
                              </div>
                              <span className="font-sans text-[10px] text-[#A0A0A0] bg-[#1E1E1E] shadow-[inset_0_0_0_1px_#313131] px-2 py-1 uppercase">{item.stat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {leaderboardData?.isEmpty && (
                       <div className="md:col-span-2 lg:col-span-3 ore-panel p-5 mx-2 sm:mx-0 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center gap-4 bg-[#111]">
                          <span className="text-4xl hover:animate-spin">📭</span>
                          <h3 className="font-minecraft text-xl md:text-2xl text-[#ffaa00]">No Player Accounts Saved Yet</h3>
                          <p className="text-[#A0A0A0] max-w-lg mx-auto leading-relaxed">The database <span className="text-white font-mono bg-[#222] px-1 py-0.5 rounded text-xs select-all">s342_luxian_player_data</span> is connected, but player accounts have not populated yet. The live data you feed directly via the Query port is actively fetching players who log in to your server online.</p>
                       </div>
                    )}
                    
                    {!leaderboardData && (
                        <div className="md:col-span-2 lg:col-span-3 ore-panel p-4 sm:p-6 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
                           <div className="w-8 h-8 border-4 border-[#3BD03B] border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-[#666] text-sm font-minecraft italic">Querying Live MySQL Database...</span>
                        </div>
                    )}
                  </div>
                </>
              )}

              {!isAdminView && activeTab === 'events' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Server Events</h2>
                    <p className="text-[#A0A0A0] font-sans">Upcoming tournaments, drop parties, and community events.</p>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    {[
                      { id: 'pvp_june15', title: 'PvP Tournament', color: '#ff5555', bgHint: '#221111', badge: 'THIS WEEKEND', desc: 'Join the arena for a massive 1v1 bracket tournament. Winner gets the exclusive [Champion] tag and 50,000 in-game currency!', day: '15', month: 'JUNE' },
                      { id: 'dragon_june22', title: 'End Dragon Respawn', color: '#55ffff', bgHint: '#112222', badge: 'UPCOMING', desc: 'We are respawning the Ender Dragon! The player to secure the killing blow gets the Dragon Egg and an Elytra.', day: '22', month: 'JUNE' },
                      { id: 'drop_july1', title: 'Drop Party', color: '#3BD03B', bgHint: '#112211', badge: 'UPCOMING', desc: 'Gather at spawn for an epic drop party covering armor, rare enchantments, crate keys, and more!', day: '01', month: 'JULY' },
                    ].map(ev => (
                      <div key={ev.id} className="ore-panel p-0 overflow-hidden group" style={{ borderLeft: `4px solid ${ev.color}` }}>
                        <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative transition-colors group-hover:bg-opacity-80" style={{ backgroundColor: `${ev.color}1A` }}>
                           <div className="flex flex-col gap-2 flex-1">
                             <div className="flex gap-4 items-center">
                               <span className="font-minecraft text-[10px] uppercase tracking-widest px-2 py-1" style={{ backgroundColor: ev.bgHint, color: ev.color }}>{ev.badge}</span>
                               <button 
                                 onClick={() => handleNotifyToggle(ev.id)}
                                 className={`font-minecraft text-[10px] tracking-widest px-2 py-1 border transition-colors ${notifiedEvents[ev.id] ? 'bg-[#3BD03B] text-black border-[#3BD03B]' : 'bg-[#1E1E1E] text-[#A0A0A0] border-[#313131] hover:border-[#3BD03B] hover:text-[#3BD03B]'}`}
                               >
                                 {notifiedEvents[ev.id] ? '✓ NOTIFYING' : '+ NOTIFY ME'}
                               </button>
                             </div>
                             <h3 className="font-minecraft text-2xl text-white text-shadow-ore">{ev.title}</h3>
                             <p className="font-sans text-[#D0D0D0] text-sm max-w-lg">{ev.desc}</p>
                           </div>
                           <div className="flex flex-col bg-[#1E1E1E] p-4 text-center min-w-[120px] border-2 border-[#111] shadow-[inset_0_0_0_1px_#333]">
                             <span className="font-minecraft text-3xl text-shadow-ore">{ev.day}</span>
                             <span className="font-minecraft text-[#A0A0A0] text-sm">{ev.month}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}



              {!isAdminView && activeTab === 'commands' && (() => {
                const allTags = Array.from(new Set(
                  commandsData.flatMap(g => (g.commands || []).flatMap((c: any) => (c.tags || c.permission || 'Everyone').split(',').map((t: string) => t.trim())))
                )).filter(Boolean).sort();

                return (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Server Commands</h2>
                    <p className="text-[#A0A0A0] font-sans">{siteConfig.commandsDescription}</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 mb-2">
                    <div className="flex-1 relative">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                       <input 
                         type="text" 
                         value={commandsSearchQuery}
                         onChange={(e) => setCommandsSearchQuery(e.target.value)}
                         placeholder="Search commands..."
                         className="ore-input pl-9 py-2 font-sans w-full text-sm"
                       />
                    </div>
                    <CustomSelect 
                      value={commandsFilter}
                      onChange={(val) => setCommandsFilter(val as any)}
                      className="w-full md:w-48"
                      buttonClassName="ore-input py-2 px-3 flex items-center justify-between font-sans w-full text-sm bg-[#111]"
                      options={[
                        { label: "All Tags", value: "All" },
                        ...allTags.map(tag => ({ label: tag, value: tag }))
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    {isCommandsLoading ? (
                      <div className="ore-panel p-4 sm:p-6 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
                         <div className="w-8 h-8 border-4 border-[#3BD03B] border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-[#666] text-sm font-minecraft italic">Loading Commands...</span>
                      </div>
                    ) : commandsData.map((group, idx) => {
                       // Filter commands within group
                       const filteredCommands = (group.commands || []).filter((c: any) => {
                          const tagList = (c.tags || c.permission || 'Everyone').split(',').map((t: string) => t.trim());
                          const matchesQuery = c.cmd.toLowerCase().includes(commandsSearchQuery.toLowerCase()) || 
                                               c.desc.toLowerCase().includes(commandsSearchQuery.toLowerCase()) || 
                                               tagList.some((t: string) => t.toLowerCase().includes(commandsSearchQuery.toLowerCase()));
                          const matchesFilter = commandsFilter === 'All' || tagList.includes(commandsFilter);
                          return matchesQuery && matchesFilter;
                       });
                       
                       // Skip rendering group if no commands match the search (and we're actively filtering)
                       if ((commandsSearchQuery || commandsFilter !== 'All') && filteredCommands.length === 0) return null;
                       const displayCommands = filteredCommands.length > 0 ? filteredCommands : group.commands;
                       
                       const isExpanded = expandedCategories.includes(idx);
                       
                       return (
                       <div key={idx} className="ore-panel p-0 overflow-hidden flex flex-col group transition-colors">
                          <button 
                            onClick={() => {
                               if (isExpanded) {
                                 setExpandedCategories(expandedCategories.filter(id => id !== idx));
                               } else {
                                 setExpandedCategories([...expandedCategories, idx]);
                               }
                            }}
                            className="bg-[#111] p-5 border-b-2 border-[#222] flex flex-col gap-1 relative overflow-hidden group-hover:bg-[#151515] transition-colors text-left w-full cursor-pointer"
                          >
                             <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10" style={{ backgroundColor: group.color || '#3BD03B' }} />
                             <div className="flex items-center justify-between relative z-10">
                               <div className="flex items-center gap-3">
                                 <Command className="w-5 h-5 shrink-0" style={{ color: group.color || '#3BD03B' }} />
                                 <h3 className="font-minecraft text-xl text-white text-shadow-ore tracking-wide">{group.category}</h3>
                               </div>
                               <div className="p-1 bg-[#222] border border-[#333] rounded ml-2">
                                  <ArrowRight className={`w-4 h-4 text-[#A0A0A0] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                               </div>
                             </div>
                             <p className="text-[#A0A0A0] text-sm relative z-10 ml-8">{group.description}</p>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 bg-gradient-to-b from-[#1A1A1A] to-[#161616]">
                                   <div className="flex flex-col gap-4">
                                     {displayCommands.map((c: any, i: number) => (
                                       <div key={i} className="relative flex flex-col gap-2 border border-[#2A2A2A] bg-[#111] p-4 rounded-sm">
                                         <div className="absolute top-4 right-4 flex gap-1 flex-wrap justify-end max-w-[50%]">
                                           {(c.tags || c.permission || 'Everyone').split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string, tagIdx: number) => (
                                             <span key={tagIdx} className={`text-[10px] uppercase font-bold px-2 py-1 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)] ${tag.toLowerCase() === 'admin' ? 'bg-[#ff5555] text-white' : tag.toLowerCase() === 'owner' ? 'bg-[#ffaa00] text-black' : 'bg-[#333] text-[#A0A0A0]'}`}>
                                               {tag}
                                             </span>
                                           ))}
                                         </div>
                                         <div className="flex items-center mt-1">
                                           <code className="font-mono text-sm px-2 py-1 bg-[#222] text-[#3BD03B] rounded border border-[#333] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">{c.cmd}</code>
                                         </div>
                                         <span className="text-[#A0A0A0] text-sm leading-relaxed pr-16">{c.desc}</span>
                                       </div>
                                     ))}
                                   </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </div>
                    )})}
                  </div>
                </>
                );
              })()}

              {!isAdminView && activeTab === 'tutorials' && (() => {
                const allTutorialTags = Array.from(new Set(
                  tutorialsData.flatMap(t => (t.tags || 'General').split(',').map((tag: string) => tag.trim()))
                )).filter(Boolean).sort();

                return (
                 <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Tutorials</h2>
                    <p className="text-[#A0A0A0] font-sans">Step-by-step guides to help you understand server features and mechanics.</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mb-2">
                    <div className="flex-1 relative">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                       <input 
                         type="text" 
                         value={tutorialsSearchQuery}
                         onChange={(e) => setTutorialsSearchQuery(e.target.value)}
                         placeholder="Search tutorials..."
                         className="ore-input pl-9 py-2 font-sans w-full text-sm"
                       />
                    </div>
                    <CustomSelect 
                      value={tutorialsFilter}
                      onChange={(val) => setTutorialsFilter(val as any)}
                      className="w-full md:w-48"
                      buttonClassName="ore-input py-2 px-3 flex items-center justify-between font-sans w-full text-sm bg-[#111]"
                      options={[
                        { label: "All Tags", value: "All" },
                        ...allTutorialTags.map(tag => ({ label: tag, value: tag }))
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                  {isTutorialsLoading ? (
                    <div className="ore-panel p-4 sm:p-6 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
                       <div className="w-8 h-8 border-4 border-[#ffaa00] border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-[#666] text-sm font-minecraft italic">Loading Tutorials...</span>
                    </div>
                  ) : (() => {
                    // Group tutorials by category
                    const grouped = tutorialsData.reduce((acc, tut) => {
                       const cat = tut.category || "General";
                       if(!acc[cat]) acc[cat] = { color: tut.color || '#ffaa00', items: [] };
                       acc[cat].items.push(tut);
                       return acc;
                    }, {} as Record<string, { color: string, items: any[] }>);

                    return Object.entries(grouped).map(([category, groupData]: [string, any]) => {
                       const filteredTutorials = groupData.items.filter((t: any) => {
                          const tagList = (t.tags || 'General').split(',').map((tag: string) => tag.trim());
                          const matchesQuery = t.title.toLowerCase().includes(tutorialsSearchQuery.toLowerCase()) || 
                                               t.content.toLowerCase().includes(tutorialsSearchQuery.toLowerCase()) ||
                                               tagList.some((tag: string) => tag.toLowerCase().includes(tutorialsSearchQuery.toLowerCase()));
                          const matchesFilter = tutorialsFilter === 'All' || tagList.includes(tutorialsFilter);
                          return matchesQuery && matchesFilter;
                       });

                       if ((tutorialsSearchQuery || tutorialsFilter !== 'All') && filteredTutorials.length === 0) return null;
                       const displayTutorials = filteredTutorials.length > 0 ? filteredTutorials : groupData.items;
                       
                       const isExpanded = expandedTutorialCategories.includes(category);
                       
                       return (
                         <div key={category} className="ore-panel p-0 overflow-hidden flex flex-col group transition-colors">
                           <button 
                             onClick={() => {
                                if (isExpanded) {
                                  setExpandedTutorialCategories(expandedTutorialCategories.filter(cat => cat !== category));
                                } else {
                                  setExpandedTutorialCategories([...expandedTutorialCategories, category]);
                                }
                             }}
                             className="bg-[#111] p-5 border-b-2 border-[#222] flex flex-col gap-1 relative overflow-hidden group-hover:bg-[#151515] transition-colors text-left w-full cursor-pointer"
                           >
                              <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10" style={{ backgroundColor: groupData.color }} />
                              <div className="flex items-center justify-between relative z-10 w-full">
                                <div className="flex items-center gap-3">
                                  <BookOpen className="w-5 h-5 shrink-0" style={{ color: groupData.color }} />
                                  <h3 className="font-minecraft text-xl text-white text-shadow-ore tracking-wide">{category}</h3>
                                  <span className="bg-[#222] text-[#A0A0A0] text-xs px-2 py-0.5 rounded shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] border border-[#333]">{displayTutorials.length} guides</span>
                                </div>
                                <div className="p-1 bg-[#222] border border-[#333] rounded ml-2">
                                   <ArrowRight className={`w-4 h-4 text-[#A0A0A0] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                           </button>

                           <AnimatePresence>
                             {isExpanded && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                 <div className="p-5 bg-gradient-to-b from-[#1A1A1A] to-[#161616]">
                                    <div className="grid grid-cols-1 gap-4">
                                      {displayTutorials.map((tut: any, i: number) => (
                                         <div key={i} className="relative flex flex-col gap-3 border border-[#2A2A2A] bg-[#111] p-5 rounded-sm">
                                            <div className="absolute top-4 right-4 flex gap-1 flex-wrap justify-end max-w-[50%]">
                                              {(tut.tags || 'General').split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string, tagIdx: number) => (
                                                <span key={tagIdx} className={`text-[10px] uppercase font-bold px-2 py-1 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)] ${tag.toLowerCase() === 'beginner' ? 'bg-[#3BD03B] text-black' : tag.toLowerCase() === 'advanced' ? 'bg-[#ff5555] text-white' : 'bg-[#333] text-[#A0A0A0]'}`}>
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                            <h4 className="font-minecraft text-lg text-white" style={{ color: tut.color || '#fff' }}>{tut.title}</h4>
                                            <div className="bg-[#151515] border border-[#222] p-4 text-[#D0D0D0] text-sm whitespace-pre-wrap leading-relaxed">
                                              {tut.content}
                                            </div>
                                         </div>
                                      ))}
                                    </div>
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       );
                    });
                  })()}
                  </div>
                 </>
                );
              })()}

              {!isAdminView && activeTab === 'store' && (
                 <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                      <div>
                        <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Server Store</h2>
                        <p className="text-[#A0A0A0] font-sans">Support the server by purchasing ranks and perks.</p>
                      </div>
                      <a href={siteConfig.storeUrl} target="_blank" rel="noopener noreferrer" className="ore-btn border-2 py-2 px-6 shadow-none font-sans text-xs inline-flex items-center gap-2 max-w-max hover:bg-[#ffaa00] hover:text-[#111] hover:border-[#ffaa00] transition-colors">
                        VISIT FULL STORE <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 sm:gap-8">
                    {/* Mock Store Item 1 */}
                    <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-4 border-t-4 border-t-[#D0D0D0] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl">
                       <div className="flex justify-between items-center">
                         <h3 className="font-minecraft text-xl sm:text-2xl lg:text-3xl text-white text-shadow-ore">VIP Rank</h3>
                         <span className="font-minecraft text-xl lg:text-2xl text-[#3BD03B]">$5.00</span>
                       </div>
                       <p className="text-[#A0A0A0] text-sm lg:text-base leading-relaxed h-12">Stand out in chat and get basic server perks.</p>
                       <div className="h-[2px] bg-[#111111] border-b border-[#464646] my-2" />
                       <ul className="text-sm lg:text-base text-[#D0D0D0] flex flex-col gap-3 my-2 list-disc pl-5">
                         <li>[VIP] Chat Prefix</li>
                         <li>Access to /nick</li>
                         <li>3 extra home slots</li>
                         <li>Priority Queue</li>
                       </ul>
                       <button className="ore-btn w-full mt-auto py-3">Purchase</button>
                    </div>

                    {/* Mock Store Item 2 */}
                    <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-4 border-t-4 border-t-[#ffaa00] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                       <div className="absolute top-4 right-[-30px] bg-[#ffaa00] text-[#111] text-[10px] font-minecraft px-10 py-1 rotate-45 border-y border-[#111]">BEST SELLER</div>
                       <div className="flex justify-between items-center">
                         <h3 className="font-minecraft text-xl sm:text-2xl lg:text-3xl text-[#ffaa00] text-shadow-ore drop-shadow">MVP Rank</h3>
                         <span className="font-minecraft text-xl lg:text-2xl text-[#3BD03B]">$15.00</span>
                       </div>
                       <p className="text-[#A0A0A0] text-sm lg:text-base leading-relaxed h-12">The ultimate supporter rank with all perks unlocked.</p>
                       <div className="h-[2px] bg-[#111111] border-b border-[#464646] my-2" />
                       <ul className="text-sm lg:text-base text-[#D0D0D0] flex flex-col gap-3 my-2 list-disc pl-5">
                         <li><span className="text-[#ffaa00]">[MVP]</span> Chat Prefix</li>
                         <li>Access to /fly in claims</li>
                         <li>10 extra home slots</li>
                         <li>Custom nickname colors</li>
                       </ul>
                       <button className="ore-btn-primary w-full mt-auto py-3 shadow-[0_0_15px_rgba(49,130,49,0.4)]">Purchase</button>
                    </div>

                    {/* Mock Store Item 3 */}
                    <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-4 border-t-4 border-t-[#aa00aa] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                       <div className="flex justify-between items-center">
                         <h3 className="font-minecraft text-xl sm:text-2xl lg:text-3xl text-[#aa00aa] text-shadow-ore drop-shadow">ELITE Rank</h3>
                         <span className="font-minecraft text-xl lg:text-2xl text-[#3BD03B]">$35.00</span>
                       </div>
                       <p className="text-[#A0A0A0] text-sm lg:text-base leading-relaxed h-12">The god-tier rank for dedicated players.</p>
                       <div className="h-[2px] bg-[#111111] border-b border-[#464646] my-2" />
                       <ul className="text-sm lg:text-base text-[#D0D0D0] flex flex-col gap-3 my-2 list-disc pl-5">
                         <li><span className="text-[#aa00aa]">[ELITE]</span> Auto-Animated Prefix</li>
                         <li>Unlimited homes</li>
                         <li>/repair & /heal commands</li>
                         <li>Custom Discord Role</li>
                       </ul>
                       <button className="ore-btn w-full mt-auto py-3">Purchase</button>
                    </div>
                  </div>
                  
                  {/* Cosmetics Section */}
                  <div className="mt-8 flex flex-col gap-6">
                     <h3 className="font-minecraft text-xl text-white text-shadow-ore border-b border-[#313131] pb-2">Cosmetics & Keys</h3>
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="ore-panel-light p-4 text-center border-t-2 border-t-[#55ffff]">
                           <span className="text-sm text-[#A0A0A0] uppercase tracking-widest block mb-2">CRATE KEY</span>
                           <h4 className="font-minecraft text-xl text-[#55ffff]">Diamond Key</h4>
                           <span className="block my-2 text-[#3BD03B] font-bold">$2.50</span>
                           <button className="ore-btn text-xs py-2 w-full mt-2">Buy</button>
                        </div>
                        <div className="ore-panel-light p-4 text-center border-t-2 border-t-[#ff55ff]">
                           <span className="text-sm text-[#A0A0A0] uppercase tracking-widest block mb-2">CRATE KEY</span>
                           <h4 className="font-minecraft text-xl text-[#ff55ff]">Mythic Key</h4>
                           <span className="block my-2 text-[#3BD03B] font-bold">$5.00</span>
                           <button className="ore-btn text-xs py-2 w-full mt-2">Buy</button>
                        </div>
                        <div className="ore-panel-light p-4 text-center border-t-2 border-t-[#ffff55]">
                           <span className="text-sm text-[#A0A0A0] uppercase tracking-widest block mb-2">COSMETIC</span>
                           <h4 className="font-minecraft text-xl text-[#ffff55]">Angel Wings</h4>
                           <span className="block my-2 text-[#3BD03B] font-bold">$10.00</span>
                           <button className="ore-btn text-xs py-2 w-full mt-2">Buy</button>
                        </div>
                        <div className="ore-panel-light p-4 text-center border-t-2 border-t-[#aa0000]">
                           <span className="text-sm text-[#A0A0A0] uppercase tracking-widest block mb-2">COSMETIC</span>
                           <h4 className="font-minecraft text-xl text-[#aa0000]">Blood Aura</h4>
                           <span className="block my-2 text-[#3BD03B] font-bold">$12.00</span>
                           <button className="ore-btn text-xs py-2 w-full mt-2">Buy</button>
                        </div>
                     </div>
                  </div>
                </>
              )}

              {!isAdminView && activeTab === 'staff' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Staff Team</h2>
                    <p className="text-[#A0A0A0] font-sans">{siteConfig.staffDescription}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-4 sm:gap-8">
                     {[
                       { name: "ServerOwner", role: "Owner", skin: "MHF_Steve", color: "#ff5555" },
                       { name: "AdminUser", role: "Admin", skin: "MHF_Alex", color: "#ffaa00" },
                       { name: "HelperMod", role: "Moderator", skin: "MHF_Pig", color: "#55ff55" }
                     ].map((staff, i) => (
                       <div key={i} className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col items-center gap-4 text-center transition-transform duration-200 hover:-translate-y-1">
                          <Image 
                            src={`https://minotar.net/helm/${staff.skin}/100.png`} 
                            alt={staff.name} 
                            width={100} 
                            height={100}
                            className="bg-[#111] p-1 border-4 border-[#1E1E1E] shadow-lg mb-2"
                            unoptimized
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-minecraft text-lg lg:text-xl text-shadow-ore">{staff.name}</h3>
                            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-1 block" style={{ color: staff.color }}>
                              {staff.role}
                            </span>
                          </div>
                       </div>
                     ))}
                  </div>
                </>
              )}

              {!isAdminView && activeTab === 'vote' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Vote</h2>
                    <p className="text-[#A0A0A0] font-sans">Vote daily to receive in-game rewards and crate keys!</p>
                  </div>
                  
                  <div className="flex flex-col gap-4 lg:gap-6">
                     {[1, 2, 3].map((num) => (
                       <div key={num} className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-transform duration-200 hover:-translate-y-1">
                          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                            <div className="w-16 h-16 bg-[#1E1E1E] border-[3px] border-[#111111] flex items-center justify-center font-minecraft text-2xl text-[#3BD03B] shadow-[inset_0_3px_0_#333]">
                              #{num}
                            </div>
                            <div>
                              <h3 className="font-minecraft text-xl lg:text-2xl uppercase text-shadow-ore text-white">Voting Site {num}</h3>
                              <span className="text-sm lg:text-base text-[#A0A0A0]">Reward: 2x Vote Keys, $500</span>
                            </div>
                          </div>
                          <button className="ore-btn-primary w-full md:w-auto px-8 py-3">VOTE NOW</button>
                       </div>
                     ))}
                  </div>
                </>
              )}

              {!isAdminView && activeTab === 'map' && (
                <>
                  <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                    <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider">Live Map</h2>
                    <p className="text-[#A0A0A0] font-sans">{siteConfig.mapDescription}</p>
                  </div>
                  
                  <div className="ore-panel p-2 h-[300px] sm:h-[400px] md:h-[500px] flex flex-col items-center justify-center relative overflow-hidden border-2 border-[#111]">
                    <div className="absolute inset-0 bg-[#1E1E1E] opacity-70 z-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://picsum.photos/seed/mcworld/1024/768")' }} />
                    <div className="absolute inset-0 backdrop-blur-md z-0" />
                    
                    <div className="bg-[#111]/80 backdrop-blur-sm p-6 border-2 border-[#333] text-center max-w-sm z-10 shadow-xl">
                      <Map className="w-12 h-12 text-[#3BD03B] mx-auto mb-4" />
                      <h3 className="font-minecraft text-xl text-white mb-2 uppercase">Dynmap Offline</h3>
                      <p className="text-[#A0A0A0] font-sans text-sm">The live map is currently disabled to prevent exploration advantages during the new season wipe.</p>
                      <button onClick={() => setActiveTab('home')} className="ore-btn mx-auto mt-6">RETURN TO DASHBOARD</button>
                    </div>
                  </div>
                </>
              )}

              {!isAdminView && activeTab === 'guestbook' && (
                <Guestbook />
              )}
              {isAdminView && (
                <>
                  {/* Admin Sub-navigation */}
                  <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-[#313131] pb-6">
                    {adminNavItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setAdminTab(item.id)}
                        className={`px-4 py-3 font-minecraft text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                          adminTab === item.id 
                            ? 'ore-btn shadow-none pointer-events-none' 
                            : 'bg-[#111] border-2 border-[#1A1A1A] hover:bg-[#1a1a1a] hover:border-[#333] text-[#A0A0A0] hover:text-[#fff]'
                        }`}
                      >
                         <item.icon className="w-4 h-4" />
                         {item.label}
                      </button>
                    ))}
                  </div>

                  {adminTab === 'console' && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                        <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">Server Console</h2>
                        <p className="text-[#A0A0A0] font-sans">Manage your server remotely using RCON.</p>
                      </div>
                      
                      {!rconAuthPassword ? (
                        <div className="ore-panel p-5 mx-2 sm:mx-0 sm:p-8 max-w-md mx-auto w-full flex flex-col gap-6 items-center text-center mt-12">
                          <div className="w-16 h-16 bg-[#1e1e1e] border-2 border-[#111] rounded-full flex items-center justify-center shadow-[inset_0_0_0_2px_#313131]">
                            <Shield className="w-8 h-8 text-[#ffaa00]" />
                          </div>
                          <div>
                            <h2 className="font-minecraft text-xl text-shadow-ore uppercase text-[#ffaa00]">RCON Authentication</h2>
                            <p className="font-sans text-sm text-[#A0A0A0] mt-2">Enter the RCON password to access advanced server controls.</p>
                          </div>
                          
                          <form onSubmit={handleAdminAuth} className="w-full flex flex-col gap-4">
                            {rconAuthError && (
                              <div className="bg-[#ff5555]/20 border border-[#ff5555] p-3 text-[#ffaa00] text-sm font-sans mb-2">
                                ERR: {rconAuthError}
                              </div>
                            )}
                            <input
                              type="text"
                              className="ore-input px-4 py-3 font-sans w-full"
                              value={rconTempGamertag}
                              onChange={e => setRconTempGamertag(e.target.value)}
                              required
                              placeholder="Gamertag"
                              disabled={isAuthenticatingRcon}
                            />
                            <CustomSelect
                              className="w-full"
                              buttonClassName="ore-input px-4 py-3 font-sans w-full flex items-center justify-between text-left"
                              value={rconTempRank}
                              onChange={val => setRconTempRank(val)}
                              options={[
                                { label: "Admin", value: "Admin" },
                                { label: "Owner", value: "Owner" },
                                { label: "Developer", value: "Developer" }
                              ]}
                            />
                            <input
                              type="password"
                              className="ore-input px-4 py-3 font-sans w-full"
                              value={rconTempPassword}
                              onChange={e => setRconTempPassword(e.target.value)}
                              required
                              placeholder="Security Clearance Password (RCON)"
                              autoFocus
                              disabled={isAuthenticatingRcon}
                            />
                            <button type="submit" disabled={isAuthenticatingRcon} className="ore-btn-primary w-full py-3 mt-2 shadow-[0_0_15px_rgba(49,130,49,0.4)]">
                              {isAuthenticatingRcon ? 'VERIFYING...' : 'LOGIN TO CONSOLE'}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col h-[500px] sm:h-[600px] md:h-[700px] mt-4">
                          <AdminConsole rconPassword={rconAuthPassword} rconPort={rconAuthPort} />
                        </div>
                      )}
                    </>
                  )}

                  {adminTab === 'manage-players' && rconAuthPassword && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                        <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">Manage Players</h2>
                        <p className="text-[#A0A0A0] font-sans">Execute bans, kicks, and remote modifications.</p>
                      </div>

                      <div className="ore-panel p-4 sm:p-6 lg:p-8 mt-4">
                        <form className="flex flex-col gap-4" onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const target = formData.get('player') as string;
                          const action = formData.get('action') as string;
                          const reason = formData.get('reason') as string;
                          const submitBtn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                          if (!target) return setActionOutput('Player name required');
                          
                          const originalText = submitBtn.innerText;
                          submitBtn.innerText = 'EXECUTING...';
                          submitBtn.disabled = true;

                          const cmd = reason ? `${action} ${target} ${reason.trim()}`.trim() : `${action} ${target}`.trim();
                          try {
                            const res = await fetch('/api/rcon', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ command: cmd, password: rconAuthPassword, port: rconAuthPort })
                            });
                            const data = await res.json();
                            setActionOutput(data.response || data.error || 'Done');
                          } catch (err: any) {
                            setActionOutput(err.message);
                          } finally {
                            submitBtn.innerText = originalText;
                            submitBtn.disabled = false;
                          }
                        }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                               <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Target Username</label>
                               <input name="player" type="text" className="ore-input p-3 font-sans" required placeholder="Notch" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Action</label>
                               <CustomSelect 
                                 name="action" 
                                 className="w-full h-full"
                                 buttonClassName="ore-input p-3 font-sans w-full h-full flex items-center justify-between text-left"
                                 value={managePlayerAction}
                                 onChange={val => setManagePlayerAction(val)}
                                 options={[
                                   { label: "Kick", value: "kick" },
                                   { label: "Ban", value: "ban" },
                                   { label: "Unban / Pardon", value: "pardon" },
                                   { label: "OP / Admin", value: "op" },
                                   { label: "De-OP / Remove Admin", value: "deop" },
                                   { label: "Kill", value: "kill" }
                                 ]}
                               />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 mt-4">
                             <label className="font-minecraft text-[10px] text-[#A0A0A0] uppercase tracking-widest">Reason (Optional)</label>
                             <input name="reason" type="text" className="ore-input p-3 font-sans" placeholder="Exploiting / Spamming" />
                          </div>
                          <button type="submit" className="ore-btn-primary py-3 px-8 self-end mt-4 uppercase tracking-widest shadow-[0_0_15px_rgba(49,130,49,0.4)]">
                            Execute Command
                          </button>
                        </form>
                      </div>
                      
                      <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-6 mt-6">
                        <div className="flex justify-between items-center border-b border-[#313131] pb-2">
                           <h3 className="font-minecraft text-xl text-white text-shadow-ore">Active Player Sessions</h3>
                           <button onClick={fetchLivePlayers} className="ore-btn px-4 py-2 text-xs flex items-center gap-2">
                              <Users className="w-4 h-4" /> Fetch via RCON
                           </button>
                        </div>
                        {livePlayersRcon === null ? (
                           <p className="text-[#A0A0A0] text-sm text-center py-4">Click &quot;Fetch via RCON&quot; to load active players.</p>
                        ) : livePlayersRcon.length === 0 ? (
                           <p className="text-[#A0A0A0] text-sm text-center py-4">No players currently online.</p>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {livePlayersRcon.map((p, i) => {
                                const cleanName = cleanMCColors(p.username);
                                const isBedrockPlayer = cleanName.startsWith('.');
                                return (
                                <div key={i} className="bg-[#1E1E1E] border border-[#111] p-4 flex justify-between items-center">
                                   <div className="flex items-center gap-3">
                                      <Image src={getMcAvatarUrl(cleanName, p.uuid, "helm", 24)} width={24} height={24} alt={cleanName} unoptimized referrerPolicy="no-referrer" />
                                      <span className="font-sans font-bold text-white" dangerouslySetInnerHTML={{ __html: parseMCColors(p.username) }} />
                                   </div>
                                   {p.uuid && (
                                      <span className="font-mono text-xs text-[#666]">{p.uuid}</span>
                                   )}
                                </div>
                                )
                             })}
                           </div>
                        )}
                      </div>
                    </>
                  )}

                  {adminTab === 'manage-config' && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                         <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">Global Configurations</h2>
                         <p className="text-[#A0A0A0] font-sans">Manage server information, strings, descriptions, and outgoing URLs across the site.</p>
                      </div>
                      
                      <div className="ore-panel p-4 sm:p-6 lg:p-8 flex flex-col gap-6 mt-4">
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Server Name</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.serverName} onChange={e => setAdminSiteConfig({...adminSiteConfig, serverName: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Server Description</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.homeWelcomeSub} onChange={e => setAdminSiteConfig({...adminSiteConfig, homeWelcomeSub: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Server IP</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.serverIp} onChange={e => setAdminSiteConfig({...adminSiteConfig, serverIp: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Server Port</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.serverPort} onChange={e => setAdminSiteConfig({...adminSiteConfig, serverPort: e.target.value})} />
                           </div>
                           
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Home Welcome Title</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.homeWelcomeTitle} onChange={e => setAdminSiteConfig({...adminSiteConfig, homeWelcomeTitle: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Home Welcome Text</label>
                             <textarea rows={4} className="ore-input" value={adminSiteConfig.homeWelcomeText} onChange={e => setAdminSiteConfig({...adminSiteConfig, homeWelcomeText: e.target.value})} />
                           </div>

                           <div className="col-span-1 md:col-span-2 my-2 border-b border-[#333]" />
                           
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Discord URL</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.discordUrl} onChange={e => setAdminSiteConfig({...adminSiteConfig, discordUrl: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Web Store URL</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.storeUrl} onChange={e => setAdminSiteConfig({...adminSiteConfig, storeUrl: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Live Map URL</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.mapUrl} onChange={e => setAdminSiteConfig({...adminSiteConfig, mapUrl: e.target.value})} />
                           </div>
                           
                           <div className="col-span-1 md:col-span-2 my-2 border-b border-[#333]" />

                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Commands Info Text</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.commandsDescription} onChange={e => setAdminSiteConfig({...adminSiteConfig, commandsDescription: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Staff Title Text</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.staffDescription} onChange={e => setAdminSiteConfig({...adminSiteConfig, staffDescription: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Live Map Tab Text</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.mapDescription} onChange={e => setAdminSiteConfig({...adminSiteConfig, mapDescription: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Players Tab Text</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.playersDescription} onChange={e => setAdminSiteConfig({...adminSiteConfig, playersDescription: e.target.value})} />
                           </div>

                           <div className="col-span-1 md:col-span-2 my-2 border-b border-[#333]" />

                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Rules Title</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.rulesTitle || ''} onChange={e => setAdminSiteConfig({...adminSiteConfig, rulesTitle: e.target.value})} />
                           </div>
                           <div className="flex flex-col gap-2 md:col-span-2">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Rules Description</label>
                             <input type="text" className="ore-input" value={adminSiteConfig.rulesDescription || ''} onChange={e => setAdminSiteConfig({...adminSiteConfig, rulesDescription: e.target.value})} />
                           </div>
                           
                           <div className="flex flex-col gap-4 md:col-span-2 border border-[#333] p-4 bg-[#1e1e1e]">
                             <label className="text-[#D0D0D0] text-sm font-minecraft">Rules Array</label>
                             {(adminSiteConfig.rules || []).map((rule: any, i: number) => (
                               <div key={i} className="flex flex-col gap-2 mb-2 pb-2 border-b border-[#333]">
                                 <input type="text" className="ore-input" placeholder="Rule Title" value={rule.title} onChange={e => {
                                   const newRules = [...(adminSiteConfig.rules || [])];
                                   newRules[i].title = e.target.value;
                                   setAdminSiteConfig({...adminSiteConfig, rules: newRules});
                                 }} />
                                 <textarea rows={2} className="ore-input" placeholder="Rule Description" value={rule.desc} onChange={e => {
                                   const newRules = [...(adminSiteConfig.rules || [])];
                                   newRules[i].desc = e.target.value;
                                   setAdminSiteConfig({...adminSiteConfig, rules: newRules});
                                 }} />
                                 <button onClick={() => {
                                   const newRules = [...(adminSiteConfig.rules || [])];
                                   newRules.splice(i, 1);
                                   setAdminSiteConfig({...adminSiteConfig, rules: newRules});
                                 }} className="self-end text-xs text-red-500 hover:text-red-400">Remove Rule</button>
                               </div>
                             ))}
                             <button onClick={() => {
                               const newRules = [...(adminSiteConfig.rules || []), { title: '', desc: '' }];
                               setAdminSiteConfig({...adminSiteConfig, rules: newRules});
                             }} className="ore-btn border-2 py-2 px-4 shadow-none bg-[#313131]">Add New Rule</button>
                           </div>
                         </div>
                         
                         <div className="flex border-t border-[#313131] pt-6 mt-4 items-center justify-between">
                            <button 
                              onClick={handleSaveConfig}
                              disabled={isSavingConfig}
                              className="ore-btn-primary py-3 px-8 shadow-[0_0_15px_rgba(49,130,49,0.3)]"
                            >
                              {isSavingConfig ? 'SAVING...' : 'SAVE CONFIGURATION'}
                            </button>
                         </div>
                      </div>
                    </>
                  )}

                  {adminTab === 'server-settings' && rconAuthPassword && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                         <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">System Operations</h2>
                         <p className="text-[#A0A0A0] font-sans">Environmental overrides and macro capabilities via RCON.</p>
                       </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                         <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                            <h3 className="font-minecraft text-lg text-shadow-ore">Power Controls</h3>
                            <p className="text-sm font-sans text-[#A0A0A0]">Send high-level state alteration signals to the SMP instance.</p>
                            <div className="grid grid-cols-2 gap-4 mt-auto">
                               <button onClick={() => setActionOutput('Start is generally done via a panel.')} className="ore-btn py-3 text-sm">Startup</button>
                               <button onClick={async (e) => {
                                  if(confirm('Are you certain you want to stop the server? It can only be restarted from the hosting panel.')) {
                                    try {
                                      await fetch('/api/rcon', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ command: 'stop', password: rconAuthPassword, port: rconAuthPort })
                                      });
                                      setActionOutput('Shutdown signal dispatched.');
                                    } catch (err: any) { setActionOutput(err.message); }
                                  }
                               }} className="ore-btn py-3 text-[#ff5555] hover:bg-[#ff5555] hover:text-white border-[#cc0000] shadow-[inset_0_-3px_0_rgba(150,0,0,0.5)] active:shadow-none text-sm">Shutdown</button>
                            </div>
                         </div>
                         
                         <div className="ore-panel p-4 sm:p-6 flex flex-col gap-4">
                            <h3 className="font-minecraft text-lg text-shadow-ore">Environmental Macros</h3>
                            <p className="text-sm font-sans text-[#A0A0A0]">Quick-execute preset RCON rules.</p>
                            <div className="grid grid-cols-2 gap-4 mt-auto">
                               <button onClick={async () => {
                                  await fetch('/api/rcon', {
                                    method: 'POST',headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: 'time set day', password: rconAuthPassword, port: rconAuthPort })
                                  });
                                  setActionOutput('Time set to day');
                               }} className="ore-btn py-3 text-sm">Time: Day</button>
                               <button onClick={async () => {
                                  await fetch('/api/rcon', {
                                    method: 'POST',headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: 'time set night', password: rconAuthPassword, port: rconAuthPort })
                                  });
                                  setActionOutput('Time set to night');
                               }} className="ore-btn py-3 text-sm">Time: Night</button>
                               <button onClick={async () => {
                                  await fetch('/api/rcon', {
                                    method: 'POST',headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: 'weather clear', password: rconAuthPassword, port: rconAuthPort })
                                  });
                                  setActionOutput('Weather cleared');
                               }} className="ore-btn py-3 text-sm">Weather: Clear</button>
                               <button onClick={async () => {
                                  await fetch('/api/rcon', {
                                    method: 'POST',headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: 'kill @e', password: rconAuthPassword, port: rconAuthPort })
                                  });
                                  setActionOutput('Killed all entities');
                               }} className="ore-btn py-3 text-[#ffaa00] text-sm">Kill Entities</button>
                            </div>
                         </div>
                      </div>
                    </>
                  )}

                  {adminTab === 'manage-commands' && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                         <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">Manage Commands</h2>
                         <p className="text-[#A0A0A0] font-sans">Edit the public commands list displayed to players.</p>
                      </div>

                      <div className="flex flex-col gap-6 mt-4">
                        <button 
                          onClick={() => {
                            setAdminCommandsData([{ category: 'New Category', description: 'Description...', color: '#3BD03B', commands: [] }, ...adminCommandsData]);
                          }}
                          className="ore-btn-primary self-start py-2 px-4 shadow-[0_0_15px_rgba(49,130,49,0.3)] text-sm"
                        >
                           + Add Category
                        </button>

                        <div className="flex flex-col gap-4">
                           {adminCommandsData.map((group, groupIdx) => (
                             <div key={groupIdx} className="ore-panel p-4 flex flex-col gap-4 border-l-4 border-[#ffaa00]">
                                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                   <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <input 
                                        type="text" 
                                        value={group.category} 
                                        onChange={(e) => {
                                           const newData = [...adminCommandsData];
                                           newData[groupIdx].category = e.target.value;
                                           setAdminCommandsData(newData);
                                        }} 
                                        placeholder="Category Name"
                                        className="bg-[#111] border-2 border-[#333] p-2 text-white font-minecraft text-sm w-full"
                                      />
                                      <input 
                                        type="text" 
                                        value={group.color} 
                                        onChange={(e) => {
                                           const newData = [...adminCommandsData];
                                           newData[groupIdx].color = e.target.value;
                                           setAdminCommandsData(newData);
                                        }} 
                                        placeholder="Hex Color (e.g. #3BD03B)"
                                        className="bg-[#111] border-2 border-[#333] p-2 text-white font-mono text-sm w-full"
                                      />
                                      <input 
                                        type="text" 
                                        value={group.description} 
                                        onChange={(e) => {
                                           const newData = [...adminCommandsData];
                                           newData[groupIdx].description = e.target.value;
                                           setAdminCommandsData(newData);
                                        }} 
                                        placeholder="Category description..."
                                        className="bg-[#111] border-2 border-[#333] p-2 text-[#A0A0A0] font-sans text-sm w-full md:col-span-2"
                                      />
                                   </div>
                                   <button 
                                      onClick={() => {
                                         if(confirm('Delete this category?')) {
                                           const newData = [...adminCommandsData];
                                           newData.splice(groupIdx, 1);
                                           setAdminCommandsData(newData);
                                         }
                                      }}
                                      className="text-[#ff5555] hover:bg-[#ff5555]/10 p-2 border-2 border-[#ff5555] font-minecraft text-xs shrink-0 self-start"
                                   >
                                      DELETE CATEGORY
                                   </button>
                                </div>

                                <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 flex flex-col gap-3">
                                   {group.commands.map((cmdItem: any, cmdIdx: number) => (
                                     <div key={cmdIdx} className="flex flex-wrap md:flex-nowrap gap-2 items-center w-full bg-[#111] p-2 border border-[#333]">
                                        <input 
                                          type="text" 
                                          value={cmdItem.cmd}
                                          onChange={(e) => {
                                             const newData = [...adminCommandsData];
                                             newData[groupIdx].commands[cmdIdx].cmd = e.target.value;
                                             setAdminCommandsData(newData);
                                          }}
                                          placeholder="/command"
                                          className="bg-transparent border-b border-[#333] px-1 py-1 text-[#3BD03B] font-mono text-xs w-full md:w-1/4"
                                        />
                                        <input 
                                          type="text" 
                                          value={cmdItem.desc}
                                          onChange={(e) => {
                                             const newData = [...adminCommandsData];
                                             newData[groupIdx].commands[cmdIdx].desc = e.target.value;
                                             setAdminCommandsData(newData);
                                          }}
                                          placeholder="Description..."
                                          className="bg-transparent border-b border-[#333] px-1 py-1 text-[#A0A0A0] font-sans text-xs flex-1 w-full"
                                        />
                                        <input 
                                          type="text" 
                                          value={cmdItem.tags || cmdItem.permission || 'Everyone'}
                                          onChange={(e) => {
                                             const newData = [...adminCommandsData];
                                             newData[groupIdx].commands[cmdIdx].tags = e.target.value;
                                             if (newData[groupIdx].commands[cmdIdx].permission) {
                                                delete newData[groupIdx].commands[cmdIdx].permission;
                                             }
                                             setAdminCommandsData(newData);
                                          }}
                                          placeholder="Tags (e.g. Admin, Plugin, Action)"
                                          className="bg-transparent border-b border-[#333] px-1 py-1 text-[#A0A0A0] font-sans text-xs w-full md:w-1/4"
                                        />
                                        <button 
                                           onClick={() => {
                                              const newData = [...adminCommandsData];
                                              newData[groupIdx].commands.splice(cmdIdx, 1);
                                              setAdminCommandsData(newData);
                                           }}
                                           className="text-[#ff5555] hover:text-[#ff0000] p-1 font-bold shrink-0 self-end md:self-auto"
                                        >
                                           <X className="w-4 h-4" />
                                        </button>
                                     </div>
                                   ))}
                                   <button 
                                     onClick={() => {
                                        const newData = [...adminCommandsData];
                                        if(!newData[groupIdx].commands) newData[groupIdx].commands = [];
                                        newData[groupIdx].commands.push({ cmd: '/newcmd', desc: 'Command description', tags: 'Everyone' });
                                        setAdminCommandsData(newData);
                                     }}
                                     className="text-[#ffaa00] text-xs font-minecraft hover:underline self-start mt-2"
                                   >
                                      + ADD COMMAND
                                   </button>
                                </div>
                             </div>
                           ))}
                        </div>

                        <div className="flex border-t border-[#313131] pt-6 mt-4 items-center justify-between">
                           <button 
                             onClick={handleSaveCommands}
                             disabled={isSavingCommands}
                             className="ore-btn-primary py-3 px-8 shadow-[0_0_15px_rgba(49,130,49,0.3)]"
                           >
                             {isSavingCommands ? 'SAVING...' : 'SAVE PUBLIC COMMANDS'}
                           </button>
                        </div>
                      </div>
                    </>
                  )}

                  {adminTab === 'manage-tutorials' && (
                    <>
                      <div className="flex flex-col gap-2 border-b-2 border-[#313131] pb-6 mb-2">
                         <h2 className="font-minecraft text-xl md:text-2xl lg:text-3xl uppercase text-shadow-ore tracking-wider text-[#ffaa00]">Manage Tutorials</h2>
                         <p className="text-[#A0A0A0] font-sans">Edit the public step-by-step guides and tutorials displayed to players.</p>
                      </div>

                      <div className="flex flex-col gap-6 mt-4">
                        <button 
                           onClick={() => {
                              setAdminTutorialsData([{ id: Date.now().toString(), title: 'New Tutorial', category: 'General', color: '#ffaa00', tags: 'Beginner', content: 'Tutorial steps...' }, ...adminTutorialsData]);
                           }}
                           className="ore-btn border-dashed border-2 py-4 border-[#313131] w-full text-[#A0A0A0] hover:text-white"
                        >
                           + CREATE NEW TUTORIAL
                        </button>
                        
                        <div className="flex flex-col gap-4">
                           {adminTutorialsData.map((tut, idx) => (
                              <div key={tut.id || idx} className="ore-panel p-4 flex flex-col gap-4 border-l-4 border-[#ffaa00]">
                                 <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex flex-col gap-2 w-full md:w-3/4">
                                       <input 
                                         type="text"
                                         value={tut.title}
                                         onChange={(e) => {
                                            const newData = [...adminTutorialsData];
                                            newData[idx].title = e.target.value;
                                            setAdminTutorialsData(newData);
                                         }}
                                         placeholder="Tutorial Title"
                                         className="bg-transparent border-b border-[#333] px-2 py-1 text-white font-minecraft text-xl w-full"
                                       />
                                       <div className="flex gap-4">
                                          <input 
                                            type="text"
                                            value={tut.category}
                                            onChange={(e) => {
                                               const newData = [...adminTutorialsData];
                                               newData[idx].category = e.target.value;
                                               setAdminTutorialsData(newData);
                                            }}
                                            placeholder="Category"
                                            className="bg-[#111] border border-[#333] px-2 py-1 text-[#A0A0A0] text-xs font-minecraft uppercase w-1/3"
                                          />
                                          <input 
                                            type="text"
                                            value={tut.tags || ''}
                                            onChange={(e) => {
                                               const newData = [...adminTutorialsData];
                                               newData[idx].tags = e.target.value;
                                               setAdminTutorialsData(newData);
                                            }}
                                            placeholder="Tags (Comma separated)"
                                            className="bg-[#111] border border-[#333] px-2 py-1 text-[#A0A0A0] text-xs font-minecraft uppercase w-1/3"
                                          />
                                          <div className="flex flex-col justify-center items-center w-12 border border-[#333] bg-[#111] p-1">
                                            <input 
                                              type="color"
                                              value={tut.color || '#ffaa00'}
                                              onChange={(e) => {
                                                 const newData = [...adminTutorialsData];
                                                 newData[idx].color = e.target.value;
                                                 setAdminTutorialsData(newData);
                                              }}
                                              className="w-full h-4 shrink-0 bg-transparent cursor-pointer border-none p-0 outline-none block mt-0"
                                              title="Theme Color"
                                            />
                                          </div>
                                       </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                         if(confirm('Delete this tutorial?')) {
                                           const newData = [...adminTutorialsData];
                                           newData.splice(idx, 1);
                                           setAdminTutorialsData(newData);
                                         }
                                      }}
                                      className="text-[#ff5555] hover:bg-[#ff5555]/10 text-xs font-minecraft border-2 border-[#ff5555] p-2 shrink-0 self-start min-w-max"
                                    >
                                       DELETE TUTORIAL
                                    </button>
                                 </div>

                                 <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 flex flex-col gap-3">
                                    <textarea 
                                      value={tut.content}
                                      onChange={(e) => {
                                         const newData = [...adminTutorialsData];
                                         newData[idx].content = e.target.value;
                                         setAdminTutorialsData(newData);
                                      }}
                                      placeholder="Write tutorial steps here..."
                                      className="bg-[#111] border border-[#333] p-3 text-[#D0D0D0] font-sans text-sm w-full min-h-[150px] resize-y"
                                    />
                                    <p className="text-[10px] text-[#A0A0A0] px-1 font-sans italic">Use plain text and step lists.</p>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="flex border-t border-[#313131] pt-6 mt-4 items-center justify-between">
                           <button 
                             onClick={handleSaveTutorials}
                             disabled={isSavingTutorials}
                             className="ore-btn-primary py-3 px-8 shadow-[0_0_15px_rgba(49,130,49,0.3)]"
                           >
                             {isSavingTutorials ? 'SAVING...' : 'SAVE PUBLIC TUTORIALS'}
                           </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showVoteToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 ore-panel p-4 flex items-center gap-4 bg-[#1E1E1E] border border-[#ffaa00] shadow-[0_0_15px_rgba(255,170,0,0.2)]"
          >
            <Star className="w-6 h-6 text-[#ffaa00] animate-pulse" />
            <div className="flex flex-col">
              <span className="font-minecraft text-[#ffaa00]">Daily Vote Available!</span>
              <span className="font-sans text-[10px] text-[#A0A0A0]">Support the server and earn rewards.</span>
            </div>
            <button onClick={() => {
                setShowVoteToast(false);
                setActiveTab('vote');
                setIsAdminView(false);
            }} className="ore-btn px-4 py-2 text-xs ml-4 border-[#ffaa00]">
               VOTE NOW
            </button>
            <button onClick={() => setShowVoteToast(false)} className="absolute -top-2 -right-2 bg-[#ff5555] text-white rounded-sm border border-[#111] w-5 h-5 flex items-center justify-center text-xs">
               ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalMeta.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setModalMeta({ ...modalMeta, isOpen: false })} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="ore-panel p-5 mx-2 sm:mx-0 sm:p-8 w-full max-w-md relative z-10 shadow-2xl flex flex-col gap-6"
            >
              <button 
                onClick={() => setModalMeta({ ...modalMeta, isOpen: false })} 
                className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="font-minecraft text-2xl uppercase text-shadow-ore border-b-2 border-[#1e1e1e] pb-4">
                {modalMeta.type === 'login' ? 'Login via Minecraft' : 'Profile Settings'}
              </h2>
              
              <p className="text-[#A0A0A0] font-sans text-sm">
                Enter your Minecraft Username (use &quot;.&quot; prefix for Bedrock accounts like .Steve)
              </p>
              
              <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
                {modalMeta.error && (
                  <div className="bg-[#ff5555] bg-opacity-20 border border-[#ff5555] p-3 text-[#ffaa00] text-sm font-sans">
                    {modalMeta.error}
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  <button 
                    type="button" 
                    onClick={() => setModalMeta({ ...modalMeta, accountType: 'java' })} 
                    className={`flex-1 py-3 font-minecraft text-sm uppercase transition-colors ${modalMeta.accountType === 'java' ? 'bg-[#318231] text-white border-b-4 border-[#1E521E]' : 'bg-[#1E1E1E] text-[#A0A0A0] border-b-4 border-[#111] hover:bg-[#2A2A2A]'}`}
                  >
                    Java
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setModalMeta({ ...modalMeta, accountType: 'bedrock' })} 
                    className={`flex-1 py-3 font-minecraft text-sm uppercase transition-colors ${modalMeta.accountType === 'bedrock' ? 'bg-[#318231] text-white border-b-4 border-[#1E521E]' : 'bg-[#1E1E1E] text-[#A0A0A0] border-b-4 border-[#111] hover:bg-[#2A2A2A]'}`}
                  >
                    Bedrock
                  </button>
                </div>
                <div className="relative flex items-center">
                  {modalMeta.accountType === 'bedrock' && (
                    <span className="absolute left-4 text-[#A0A0A0] font-sans text-lg font-bold pointer-events-none">.</span>
                  )}
                  <input 
                    type="text" 
                    value={modalMeta.tempValue}
                    onChange={(e) => setModalMeta({ ...modalMeta, tempValue: e.target.value.replace(/^\./, '') })}
                    placeholder={modalMeta.accountType === 'bedrock' ? "steve" : "Steve"}
                    className={`ore-input px-4 py-3 font-sans w-full text-lg ${modalMeta.accountType === 'bedrock' ? 'pl-8' : ''}`}
                    autoFocus
                  />
                </div>
                
                {modalMeta.type !== 'login' && (
                  <div className="flex items-center gap-3 mt-2 mb-2 p-3 border border-[#313131] bg-[#1E1E1E]">
                    <input 
                       type="checkbox" 
                       id="voteReminder" 
                       checked={modalMeta.voteRem || false} 
                       onChange={(e) => setModalMeta({ ...modalMeta, voteRem: e.target.checked })}
                       className="w-5 h-5 accent-[#3BD03B] bg-[#111] border-[#313131]"
                    />
                    <label htmlFor="voteReminder" className="flex flex-col cursor-pointer">
                      <span className="font-minecraft text-sm text-white">Daily Vote Reminder</span>
                      <span className="font-sans text-[10px] text-[#A0A0A0]">Receive a toast notification if you haven&apos;t voted today.</span>
                    </label>
                  </div>
                )}
                <button type="submit" className="ore-btn-primary w-full py-4 uppercase tracking-widest mt-2">
                  CONFIRM
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {actionOutput && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setActionOutput(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="ore-panel p-5 mx-2 sm:mx-0 sm:p-8 w-full max-w-lg relative z-[60] shadow-2xl flex flex-col gap-6 font-mono text-sm"
            >
              <button 
                onClick={() => setActionOutput(null)} 
                className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="font-minecraft text-xl uppercase text-shadow-ore border-b-2 border-[#1e1e1e] pb-4 text-[#3BD03B]">
                System Output
              </h2>
              
              <div 
                className="bg-[#111] border-2 border-[#1E1E1E] p-4 text-[#A0A0A0] max-h-[300px] overflow-y-auto whitespace-pre-wrap custom-scrollbar"
                dangerouslySetInnerHTML={{ __html: parseMCColors(actionOutput) }}
              />
              
              <button onClick={() => setActionOutput(null)} className="ore-btn border-t-0 p-3 mt-2 text-white">
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
