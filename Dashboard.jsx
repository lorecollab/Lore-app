import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TopNav from "../components/TopNav";
import { api } from "../lib/api";
import { Plus, MessageCircle, Pencil, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";

export default function Dashboard() {
  const [chars, setChars] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    try {
      const r = await api.get("/characters");
      setChars(r.data);
    } catch (e) {
      toast.error("Could not load characters");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/characters/${id}`);
      toast.success("Character vanished into the mist.");
      setChars((c) => c.filter((x) => x.id !== id));
    } catch {
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1613] text-[#EDE4D3] noise-overlay">
      <TopNav />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#C9A96A] mb-3">— Your Grimoire —</p>
            <h1 className="font-serif-display text-5xl sm:text-6xl font-light leading-none" data-testid="dashboard-title">
              Your Characters
            </h1>
          </div>
          <Link
            to="/characters/new"
            className="border border-[#C9A96A] text-[#C9A96A] hover:bg-[#C9A96A] hover:text-[#1A1613] transition-all duration-300 px-6 py-3 uppercase tracking-[0.25em] text-xs flex items-center gap-2"
            data-testid="btn-new-character"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Summon one
          </Link>
        </div>

        {loading ? (
          <div className="text-[#857E71] animate-shimmer" data-testid="dashboard-loading">Gathering souls…</div>
        ) : chars.length === 0 ? (
          <div className="border border-white/5 p-16 text-center" data-testid="empty-state">
            <p className="font-serif-display text-3xl text-[#B8AFA0] italic mb-4">No characters yet.</p>
            <p className="text-[#857E71] mb-8">Every world begins with one soul. Bring yours to life.</p>
            <button
              onClick={() => nav("/characters/new")}
              className="border border-[#C9A96A] text-[#C9A96A] hover:bg-[#C9A96A] hover:text-[#1A1613] transition-all px-6 py-3 uppercase tracking-[0.25em] text-xs"
              data-testid="empty-create-btn"
            >
              Create your first character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="character-grid">
            {chars.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-[#22201C] border border-white/5 hover:border-[#C9A96A]/40 transition-all duration-500 group relative overflow-hidden"
                data-testid={`character-card-${c.id}`}
              >
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 flex items-center justify-center border border-[#C9A96A]/30 bg-[#2D2823]">
                      <span className="font-serif-display text-2xl text-[#C9A96A]">
                        {c.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif-display text-2xl leading-tight truncate" data-testid={`char-name-${c.id}`}>{c.name}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#857E71] mt-1 truncate">
                        {c.role || "Unknown Role"}{c.age ? ` · ${c.age}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#B8AFA0] leading-relaxed line-clamp-3 min-h-[4.5rem]">
                    {c.personality || c.background || "A soul yet to be known."}
                  </p>
                </div>
                <div className="border-t border-white/5 grid grid-cols-4 divide-x divide-white/5 text-xs">
                  <Link to={`/chat/${c.id}`} className="flex items-center justify-center gap-1 py-3 text-[#C9A96A] hover:bg-[#C9A96A]/10 transition-colors uppercase tracking-[0.15em]" data-testid={`btn-chat-${c.id}`}>
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5}/> Chat
                  </Link>
                  <Link to={`/characters/${c.id}/memories`} className="flex items-center justify-center gap-1 py-3 text-[#B8AFA0] hover:text-[#C9A96A] hover:bg-white/5 transition-colors" data-testid={`btn-memories-${c.id}`}>
                    <Brain className="w-3.5 h-3.5" strokeWidth={1.5}/>
                  </Link>
                  <Link to={`/characters/${c.id}/edit`} className="flex items-center justify-center gap-1 py-3 text-[#B8AFA0] hover:text-[#C9A96A] hover:bg-white/5 transition-colors" data-testid={`btn-edit-${c.id}`}>
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5}/>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center justify-center gap-1 py-3 text-[#B8AFA0] hover:text-red-400 hover:bg-red-500/5 transition-colors" data-testid={`btn-delete-${c.id}`}>
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5}/>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#22201C] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif-display text-2xl text-[#EDE4D3]">Forget {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#B8AFA0]">
                          All memories, scenes, and conversations will be lost to time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border border-white/20 text-[#B8AFA0]">Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(c.id)} className="bg-[#7A3A2E] hover:bg-[#8F4A3E] text-[#EDE4D3]" data-testid={`confirm-delete-${c.id}`}>
                          Let them fade
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
