import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";

export default function Personas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = () => api.get("/personas").then((r) => setItems(r.data))
    .catch(() => toast.error("Could not load"))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try { await api.delete(`/personas/${id}`); setItems((x) => x.filter((p) => p.id !== id)); toast.success("Persona deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="personas-title">Your Personas</h1>
              <p className="text-sm text-[#A99B91] mt-1">Identities you can roleplay as. Pick one in any chat.</p>
            </div>
            <Link to="/personas/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="personas-create-btn">
              <Plus className="w-4 h-4"/> New Persona
            </Link>
          </div>

          {loading ? (
            <div className="text-[#7A6D62] mt-8" data-testid="personas-loading">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#3A2F2A] rounded-2xl mt-8" data-testid="personas-empty">
              <User className="w-8 h-8 text-[#D8B982] mx-auto mb-3"/>
              <h2 className="text-xl font-semibold mb-1">No personas yet</h2>
              <p className="text-[#A99B91] mb-5 text-sm">Create one to step into the conversation as someone else.</p>
              <button onClick={() => nav("/personas/new")} className="px-5 py-2.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="personas-empty-create-btn">
                Create Persona
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8" data-testid="personas-grid">
              {items.map((p) => (
                <div key={p.id} className="bg-[#13151B] border border-[#3A2F2A] rounded-2xl p-4 flex gap-4 items-start" data-testid={`persona-card-${p.id}`}>
                  <Avatar name={p.name} path={p.avatar_path} size={56}/>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#F7EFE6] truncate">{p.name}</p>
                    <p className="text-xs text-[#A99B91] truncate">
                      {[p.age, p.pronouns, p.occupation].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-[#7A6D62] mt-1 line-clamp-2">{p.appearance || p.personality || p.background || ""}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Link to={`/personas/${p.id}/edit`} className="text-xs text-[#D8B982] hover:text-[#D8B982] inline-flex items-center gap-1" data-testid={`persona-edit-${p.id}`}>
                        <Pencil className="w-3.5 h-3.5"/> Edit
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-xs text-[#A99B91] hover:text-red-400 inline-flex items-center gap-1" data-testid={`persona-delete-${p.id}`}>
                            <Trash2 className="w-3.5 h-3.5"/> Delete
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#13151B] border-[#3A2F2A]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-[#F7EFE6]">Delete {p.name}?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#A99B91]">This persona will be removed from any chats it's currently active in.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-[#3A2F2A] text-[#F7EFE6]">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(p.id)} className="bg-red-500 hover:bg-red-400 text-white" data-testid={`persona-delete-confirm-${p.id}`}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
