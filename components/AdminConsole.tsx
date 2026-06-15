'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal, Send } from 'lucide-react';
import { parseMCColors } from '@/lib/utils';

export function AdminConsole({ rconPassword, rconPort }: { rconPassword: string, rconPort: string }) {
  const [logs, setLogs] = useState<{type: 'system' | 'command' | 'response' | 'error', text: string}[]>([
    { type: 'system', text: 'Connected to Luxian Network Terminal. Ready for commands.' }
  ]);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || loading || !rconPassword) return;

    const cmd = command.trim();
    setCommand('');
    setLogs(prev => [...prev, { type: 'command', text: `> ${cmd}` }]);
    setLoading(true);

    try {
      const res = await fetch('/api/rcon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, password: rconPassword, port: rconPort }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLogs(prev => [...prev, { type: 'error', text: data.error || 'Unknown error' }]);
      } else {
        setLogs(prev => [...prev, { type: 'response', text: data.response || 'Success (No output)' }]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { type: 'error', text: err.message || 'Network error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex-1 bg-[#111] border-2 border-[#1E1E1E] p-4 font-mono text-sm overflow-y-auto flex flex-col shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] custom-scrollbar">
        {logs.map((log, i) => {
          let extraStyle = '';
          if (log.type === 'system') extraStyle = 'text-[#ffaa00]';
          else if (log.type === 'command') extraStyle = 'text-white opacity-80';
          else if (log.type === 'error') extraStyle = 'text-[#ff5555]';
          else extraStyle = 'text-[#A0A0A0]';

          return (
             <div key={i} className={`mb-1 whitespace-pre-wrap ${extraStyle}`} dangerouslySetInnerHTML={{ __html: parseMCColors(log.text) }} />
          );
        })}
        <div ref={logsEndRef} />
      </div>
      
      <form onSubmit={executeCommand} className="flex gap-2">
        <div className="flex-1 relative flex items-center">
          <Terminal className="w-5 h-5 text-[#A0A0A0] absolute left-3" />
          <input
            type="text"
            className="ore-input pl-10 pr-4 py-3 w-full font-mono text-sm"
            placeholder="Type a command (e.g. say Hello, help)..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !command.trim()} 
          className="ore-btn-primary px-6 flex items-center justify-center disabled:opacity-50"
        >
          {loading ? '...' : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
