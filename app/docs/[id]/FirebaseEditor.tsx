"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase-client";
import "quill/dist/quill.snow.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";
import {
  RiMagicLine,
  RiMicLine,
  RiVolumeUpLine,
  RiDownloadLine,
  RiStopLine,
} from "@remixicon/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RiSaveLine, RiSearchEyeLine } from "react-icons/ri";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type QuillType = typeof import("quill");
import type Quill from "quill";


interface FirestoreDeltaDoc {
  deltaOps: any[];
  updatedAt?: any;
}

interface PresenceDoc {
  name: string;
  color: string;
  index: number; // -1 means hidden
  length: number;
  updatedAt: any;
}

export default function FirebaseEditor({ docId }: { docId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const cursorsModuleRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const docRefRef = useRef<ReturnType<typeof doc> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const savingTimer = useRef<number | null>(null);
  const slowSavingTimer = useRef<number | null>(null);
  const isApplyingRemote = useRef(false);
  const { isSignedIn, userId } = useAuth();
  const [lastEditAt, setLastEditAt] = useState<number>(0);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number>(0);
  const [hasAnySnapshot, setHasAnySnapshot] = useState<boolean>(false);
  

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadCommitMessage, setDownloadCommitMessage] = useState("");
  const { user } = useUser();
  const handleDownloadClick = () => {
  // Always ask user to confirm snapshot save before downloading
  setDownloadOpen(true);
};


  useEffect(() => {
    if (!isSignedIn) return;

    let unsubDoc: (() => void) | null = null;
    let unsubPresence: (() => void) | null = null;
    let _hasUnmounted = false;

    const setup = async () => {
      if (typeof window === "undefined") return;

      const [{ default: Quill }] = await Promise.all([import("quill")]);
      try {
        const { default: QuillCursors } = await import("quill-cursors");
        // @ts-ignore register module for Quill
        Quill.register("modules/cursors", QuillCursors);
      } catch (e) {
        console.warn("quill-cursors not available", e);
      }

      const editorEl = document.createElement("div");
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(editorEl);

      const quill = new Quill(editorEl, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "blockquote", "code-block"],
            ["clean"],
          ],
          cursors: true,
        },
      });
      quillRef.current = quill as any;
      cursorsModuleRef.current = quill.getModule("cursors");

      // Ensure base document exists
      const docRef = doc(db, "documents", docId);
      docRefRef.current = docRef;
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          deltaOps: [],
          updatedAt: serverTimestamp(),
        } satisfies FirestoreDeltaDoc);
      }
      // Migrate any legacy 'delta' field (Quill Delta instance) to plain JSON ops
      if (snap.exists()) {
        const data: any = snap.data();
        if (data && data.delta !== undefined) {
          console.log("Migrating legacy delta field:", data.delta);
          let ops: any[] | null = null;
          if (Array.isArray(data.delta?.ops)) ops = data.delta.ops;
          else if (Array.isArray(data.delta)) ops = data.delta;
          else {
            console.warn("Unable to extract ops from delta:", data.delta);
          }
          try {
            await setDoc(
              docRef,
              {
                deltaOps: ops ?? [],
                delta: deleteField(),
                updatedAt: serverTimestamp(),
              } as any,
              { merge: true }
            );
            console.log("Successfully migrated delta field to deltaOps");
          } catch (error) {
            console.error("Failed to migrate delta field:", error);
            throw error;
          }
        }
      }

      // Subscribe to document content
      unsubDoc = onSnapshot(docRef, (ds) => {
        if (!ds.exists()) return;
        const data = ds.data() as FirestoreDeltaDoc;
        if (!data?.deltaOps) return;
        // Prevent echo when we are the writer
        if (isApplyingRemote.current) return;
        const current = (quillRef.current as any)?.getContents?.();
        // Only update if changed
        try {
          const incoming = { ops: data.deltaOps };
          if (JSON.stringify(current?.ops) !== JSON.stringify(incoming.ops)) {
            const q = quillRef.current as any;
            const sel = q.getSelection();
            q.setContents(incoming);
            if (sel) {
              // Restore selection to avoid cursor jump to start
              try {
                q.setSelection(sel.index, sel.length ?? 0, "silent");
              } catch {}
            }
          }
        } catch {}
      });

      // Push local edits to Firestore with word-boundary gating
      // Ensure quill instance exists before adding event listeners
if (!quill) return;

// Push local edits to Firestore with word-boundary gating
quill.on("text-change", (_delta: any, _old: any, source: string) => {
  if (source !== "user") return;
  setLastEditAt(Date.now());
      // Determine if this input contains a whitespace (space, tab, newline)
        const insertedText = Array.isArray(_delta?.ops)
          ? _delta.ops
              .map((o: any) => (typeof o.insert === "string" ? o.insert : ""))
              .join("")
          : "";
        const hasWordBoundary = /\s/.test(insertedText);

        const persist = async () => {
          try {
            isApplyingRemote.current = true;
            const delta = quill.getContents();
            await setDoc(
              docRef,
              {
                deltaOps: delta.ops,
                updatedAt: serverTimestamp(),
              } as FirestoreDeltaDoc,
              { merge: true }
            );
          } catch (error) {
            console.error("Failed to save to Firestore:", error);
          } finally {
            setTimeout(() => {
              isApplyingRemote.current = false;
            }, 0);
          }
        };

        // Fast debounce when a word boundary is typed; otherwise slow idle flush
        if (savingTimer.current) window.clearTimeout(savingTimer.current);
        if (slowSavingTimer.current) window.clearTimeout(slowSavingTimer.current);

        if (hasWordBoundary) {
          savingTimer.current = window.setTimeout(() => {
            void persist();
          }, 120);
        } else {
          // User is typing within a word; flush after brief idle to avoid lag
          slowSavingTimer.current = window.setTimeout(() => {
            void persist();
          }, 1200);
        }
      });

      // Rollback handler: accept external delta JSON and persist
      
      const onApplyDelta = (e: Event) => {
      const custom = e as CustomEvent<{ delta: any }>;
      const delta = custom.detail?.delta;
        if (!delta) return;
        try {
          (quillRef.current as any).setContents(delta);
          const ops = Array.isArray(delta?.ops) ? delta.ops : delta;
          console.log("Rollback: saving ops to Firestore:", {
            ops,
            opsType: typeof ops,
            opsLength: ops?.length,
            updatedAt: serverTimestamp(),
          });
          void setDoc(
            docRef,
            {
              deltaOps: ops,
              updatedAt: serverTimestamp(),
            } as FirestoreDeltaDoc,
            { merge: true }
          );
        } catch (error) {
          console.error("Rollback: Failed to save to Firestore:", error);
        }
      };
      window.addEventListener("apply-delta", onApplyDelta as EventListener);

      // Presence: write local selection and listen to others
      const presenceCol = collection(db, "documents", docId, "presence");
      const myPresenceRef = doc(presenceCol, userId ?? "anonymous");

      const color = `hsl(${
        Math.abs(
          (userId ?? "anon").split("").reduce((a, c) => a + c.charCodeAt(0), 0)
        ) % 360
      }, 70%, 50%)`;
      const displayName =
        (user?.fullName && user.fullName.trim()) ||
        (user as any)?.username ||
        (user as any)?.primaryEmailAddress?.emailAddress ||
        userId ||
        "anonymous";

      const writePresence = async (index: number, length: number) => {
        const presenceData = {
          name: displayName,
          color,
          index,
          length,
          updatedAt: serverTimestamp(),
        } as PresenceDoc;
        console.log("Writing presence to Firestore:", {
          ...presenceData,
          nameType: typeof displayName,
          colorType: typeof color,
          indexType: typeof index,
          lengthType: typeof length,
        });
        try {
          await setDoc(myPresenceRef, presenceData, { merge: true });
          console.log("Successfully wrote presence");
        } catch (error) {
          console.error("Failed to write presence:", error);
          throw error;
        }
      };

      // Initial presence (hidden)
      await writePresence(-1, 0);

      const onSelection = (range: any, _oldRange: any, source: string) => {
        if (source !== "user") return;
        if (!range) return void writePresence(-1, 0);
        void writePresence(range.index, range.length ?? 0);
      };      
      quill.on("selection-change", onSelection);

      unsubPresence = onSnapshot(presenceCol, (qs) => {
        const cursors = cursorsModuleRef.current;
        if (!cursors) return;
        qs.docChanges().forEach((change) => {
          const id = change.doc.id;
          if (id === (userId ?? "anonymous")) return;
          const data = change.doc.data() as PresenceDoc;
          if (change.type === "removed") {
            try {
              cursors.removeCursor(id);
            } catch {}
            return;
          }
          if (data.index < 0) {
            try {
              cursors.removeCursor(id);
            } catch {}
            return;
          }
          try {
            if (!cursors.cursors?.[id]) {
              cursors.createCursor(id, data.name || id, data.color);
            }
            cursors.moveCursor(id, {
              index: data.index,
              length: data.length ?? 0,
            });
          } catch {}
        });
      });

      // 🧹 Clean up on unload: hide presence and remove listeners
const onBeforeUnload = async () => {
  try {
    await deleteDoc(myPresenceRef);
  } catch (err) {
    console.error("Error cleaning up presence:", err);
  }
};
window.addEventListener("beforeunload", onBeforeUnload);

setIsReady(true);

// Allow parent/page to open the commit dialog
const openDialog = () => {
  setCommitMessage("");
  setShowCommitDialog(true);
};
window.addEventListener("open-commit-dialog", openDialog);

// Track latest snapshot timestamp to detect unsaved state
try {
  const versionsCol = collection(db, "documents", docId, "versions");
  onSnapshot(versionsCol, (snap) => {
    let latest = 0;
    setHasAnySnapshot(snap.size > 0);
    snap.docs.forEach((d) => {
      const v: any = d.data();
      const t = v.createdAt?.toMillis?.() ?? (v.timestamp ? Date.parse(v.timestamp) : 0);
      if (t && t > latest) latest = t;
    });
    if (latest) setLastSnapshotAt(latest);
  });
} catch (err) {
  console.error("Snapshot tracking failed:", err);
}

return () => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.removeEventListener("apply-delta", onApplyDelta as EventListener);
  window.removeEventListener("open-commit-dialog", openDialog);
  quill.off("selection-change", onSelection);
  if (savingTimer.current) window.clearTimeout(savingTimer.current);
  if (slowSavingTimer.current) window.clearTimeout(slowSavingTimer.current);
};
};

setup();

return () => {
  _hasUnmounted = true;
  if (unsubDoc) unsubDoc();
  if (unsubPresence) unsubPresence();
};
}, [docId, isSignedIn, userId]);

// Save snapshot dialog
const handleSaveSnapshot = () => {
  setCommitMessage("");
  setShowCommitDialog(true);
};

const handleConfirmSaveSnapshot = async () => {
  if (!quillRef.current || !commitMessage.trim()) return;

  setIsSavingSnapshot(true);
  try {
    const delta = quillRef.current.getContents();
    console.log("Saving snapshot with delta:", delta);

    const response = await fetch(`/api/documents/${docId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ delta, commitMessage: commitMessage.trim() }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Failed to save snapshot:", response.status, detail);
      return;
    }

    const result = await response.json();
    console.log("Snapshot saved:", result);

    setShowCommitDialog(false);
    setCommitMessage("");
  } catch (error) {
    console.error("Error saving snapshot:", error);
  } finally {
    setIsSavingSnapshot(false);
  }
};

// AI: Summarize selected text or whole document
const handleSummarize = async () => {
  try {
    setIsSummarizing(true);
const q = quillRef.current;
if (!q) {
  console.warn("⚠️ Quill editor not ready.");
  setIsSummarizing(false);
  return;
}

const range = q.getSelection();
const text =
  range && range.length > 0
    ? q.getText(range.index, range.length)
    : q.getText();



    const res = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });

    if (!res.ok) return;

    const { summary } = await res.json();
    setSummaryText(summary || "");
    setShowSummaryDialog(true);
  } catch (e) {
    console.error("Summarize failed", e);
  } finally {
    setIsSummarizing(false);
  }
};

// ✅ Fixed: Proper handler name (consistent with button)
const handlePlagiarismCheck = async () => {
  if (!summaryText || summaryText.trim() === "") {
    alert("Please generate or write some text to check plagiarism.");
    return;
  }

  setIsCheckingPlagiarism(true);
  try {
    const res = await fetch("/api/check-plagiarism", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summaryText }),
    });

    const data = await res.json();
    setPlagiarismResult(data.result);
  } catch (error) {
    console.error("Error checking plagiarism:", error);
    alert("Error checking plagiarism.");
  } finally {
    setIsCheckingPlagiarism(false);
  }
};

// AI: Trigger audio file select and send to transcribe
const handleChooseAudio = () => {
  if (!fileInputRef.current) return;
  fileInputRef.current.value = "";
  fileInputRef.current.click();
};

const handleAudioSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/ai/transcribe", {
      method: "POST",
      body: fd,
      credentials: "include",
    });

    if (!res.ok) return;

    const { text } = await res.json();
const q = quillRef.current;
if (!q) {
  console.warn("⚠️ Quill editor not ready.");
  return;
}

const range = q.getSelection();
const insertAt = range ? range.index : q.getLength();

q.insertText(insertAt, `\n[Transcript]\n${text}\n`, "silent");

  } catch (err) {
    console.error("Transcription failed", err);
  }
};

// Live dictation using Web Speech API
const startListening = () => {
  try {
    const SR: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported in this browser");
      return;
    }

    const recog = new SR();
    recognitionRef.current = recog;
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    setInterim("");
    setIsListening(true);

    const q = quillRef.current;
    let anchorIndex = q.getSelection()?.index ?? q.getLength();


    recog.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }

      // Insert final text
      if (finalText && q) {
        q.insertText(anchorIndex, finalText + " ", "silent");
        anchorIndex += (finalText + " ").length;
        q.setSelection(anchorIndex, 0, "silent");

        // Save dictated text to Firestore
        try {
          const ref = docRefRef.current;
          if (ref) {
            const currentDelta = q.getContents();
            isApplyingRemote.current = true;
          
            (async () => {
              try {
                await setDoc(
                  ref,
                  {
                    deltaOps: currentDelta.ops,
                    updatedAt: serverTimestamp(),
                  } as any,
                  { merge: true }
                );
              } catch (e) {
                console.error("Failed to sync dictated text:", e);
              } finally {
                setTimeout(() => {
                  isApplyingRemote.current = false;
                }, 0);
              }
            })();
          }
          
        } catch (e) {
          console.error("Failed to sync dictated text:", e);
        }
      }

      setInterim(interimText);
    };

    recog.onerror = () => stopListening();
    recog.onend = () => {
      setIsListening(false);
      setInterim("");
    };
    recog.start();
  } catch (err) {
    console.error("Listening failed:", err);
  }
};

const stopListening = () => {
  try {
    recognitionRef.current?.stop?.();
  } catch {}
  setIsListening(false);
  setInterim("");
};
// 🎤 Text-to-Speech (browser SpeechSynthesis)
const pickFemaleVoice = (): SpeechSynthesisVoice | null => {
  try {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return null;

    const voices = synth.getVoices?.() || [];
    const preferNames = [
      "female",
      "woman",
      "Google UK English Female",
      "Google US English",
      "Samantha",
      "Victoria",
      "Karen",
      "Tessa",
      "Serena",
      "Moira",
      "Zira",
      "Salli",
    ];

    const byName = voices.find((v) =>
      preferNames.some((n) => v.name.toLowerCase().includes(n.toLowerCase()))
    );
    if (byName) return byName;

    // fallback: first en-* voice
    const byLang = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    return byLang || voices[0] || null;
  } catch (e) {
    console.error("Voice selection failed:", e);
    return null;
  }
};

// 🔄 Warm up voices and remember preferred one
useEffect(() => {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return;

  const updateVoices = () => {
    preferredVoiceRef.current = pickFemaleVoice();
  };

  // Wait a bit to ensure voices are loaded (esp. on Chrome)
  const loadVoices = () => {
    if (synth.getVoices().length === 0) {
      setTimeout(loadVoices, 250);
    } else {
      updateVoices();
    }
  };

  loadVoices();
  synth.addEventListener?.("voiceschanged", updateVoices as any);

  return () => {
    synth.removeEventListener?.("voiceschanged", updateVoices as any);
  };
}, []);

// ▶️ Start Text-to-Speech (Improved)
const startTTS = () => {
  try {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn("Speech Synthesis not supported in this browser.");
      return;
    }

   const q = quillRef.current;
if (!q) {
  console.warn("⚠️ Quill editor not ready.");
  return;
}

const range = q.getSelection();
const text =
  range && range.length > 0
    ? q.getText(range.index, range.length)
    : q.getText();

    if (!text?.trim()) {
      console.warn("No text selected or available for TTS.");
      return;
    }

    // Ensure voices are loaded before speaking
    let voices = synth.getVoices();
    if (voices.length === 0) {
      synth.onvoiceschanged = () => startTTS(); // Retry once voices are ready
      console.log("Waiting for voices to load...");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredVoiceRef.current || pickFemaleVoice() || voices[0];
    utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      console.log("🔊 Speaking started");
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log("✅ Speaking ended");
      setIsSpeaking(false);
      ttsUtteranceRef.current = null;
    };

    utterance.onerror = (err) => {
      console.error("🔴 TTS playback error:", err?.error || err);
      toast.error("TTS failed — please try again or refresh voices.");
      setIsSpeaking(false);
      ttsUtteranceRef.current = null;
    };

    // Cancel any active utterance before speaking
    synth.cancel();
    ttsUtteranceRef.current = utterance;

    // Small delay prevents Chrome race condition
    setTimeout(() => {
      synth.speak(utterance);
    }, 150);
  } catch (e) {
    console.error("TTS initialization failed:", e);
    toast.error("Text-to-speech unavailable in this browser.");
  }
};

// ⏹ Stop TTS playback
const stopTTS = () => {
  try {
    const synth = window.speechSynthesis;
    synth?.cancel();
    console.log("⏹️ TTS stopped");
  } catch (err) {
    console.error("Stop TTS failed:", err);
  }
  setIsSpeaking(false);
  ttsUtteranceRef.current = null;
};

// 🧾 Generate PDF from plain text
const generatePdfFromText = (text: string) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const height = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(text, width);
  let y = margin;
  const lineHeight = 16;

  lines.forEach((line: string) => {
    if (y > height - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(`document-${new Date().toISOString().slice(0, 10)}.pdf`);
};

// 📥 Download latest snapshot → convert to PDF
const downloadLatestSnapshotPdf = async () => {
  setDownloading(true);
  try {
    const versionsCol = collection(db, "documents", docId, "versions");
    const snap = await getDocs(versionsCol);
    const items: any[] = [];

    snap.docs.forEach((d) => items.push(d.data()));
    items.sort((a, b) => {
      const at = a.createdAt?.toMillis?.() ?? (a.timestamp ? Date.parse(a.timestamp) : 0);
      const bt = b.createdAt?.toMillis?.() ?? (b.timestamp ? Date.parse(b.timestamp) : 0);
      return bt - at;
    });

    const latest = items[0];
    const q = quillRef.current;
    let text = "";

    if (!latest) {
      text = q?.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    const key = latest.s3Key ?? latest.fileKey;
    if (!key) {
      text = q?.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey: key }),
    });

    if (!res.ok) {
      text = q?.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    const { downloadUrl } = await res.json();
    const delta = await fetch(downloadUrl).then((r) => r.json());
    const ops = Array.isArray(delta?.ops) ? delta.ops : delta;
    text = Array.isArray(ops)
      ? ops.map((o: any) => (typeof o.insert === "string" ? o.insert : " ")).join("")
      : "";

    generatePdfFromText(text);
  } catch (e) {
    console.error("Download latest snapshot failed:", e);
    try {
      const q = quillRef.current;
      const text = q?.getText?.() || "";
      generatePdfFromText(text);
    } catch (err) {
      console.error("PDF generation fallback failed:", err);
    }
  } finally {
    setDownloading(false);
    setDownloadOpen(false);
  }
};
// 💾 Save a snapshot of current content, then download that snapshot
const saveSnapshotAndDownload = async () => {
  setDownloading(true);
  try {
    const q = quillRef.current;
    if (!q) throw new Error("Quill not ready");

    const delta = q.getContents?.();
    if (!delta) {
      // fallback: use text if delta missing
      const text = q.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    // Save snapshot to backend
    const res = await fetch(`/api/documents/${docId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        delta,
        commitMessage: downloadCommitMessage.trim() || "Snapshot before PDF download",
      }),
    });

    if (!res.ok) {
      console.warn("Snapshot save failed, falling back to current text");
      const text = q.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    const { fileKey } = await res.json();
    if (!fileKey) {
      console.warn("No fileKey in snapshot response, using current text");
      const text = q.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    // Download file from S3
    const down = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey }),
    });

    if (!down.ok) {
      console.warn("Download fetch failed, fallback to current text");
      const text = q.getText?.() || "";
      generatePdfFromText(text);
      return;
    }

    const { downloadUrl } = await down.json();
    const snapshotDelta = await fetch(downloadUrl).then((r) => r.json());
    const ops = Array.isArray(snapshotDelta?.ops) ? snapshotDelta.ops : snapshotDelta;

    const text = Array.isArray(ops)
      ? ops.map((o: any) => (typeof o.insert === "string" ? o.insert : " ")).join("")
      : "";

    generatePdfFromText(text);
  } catch (e) {
    console.error("Save snapshot and download failed:", e);
    try {
      const q = quillRef.current;
      const text = q?.getText?.() || "";
      generatePdfFromText(text);
    } catch (innerErr) {
      console.error("Fallback PDF generation failed:", innerErr);
    }
  } finally {
    setDownloading(false);
    setDownloadOpen(false);
    setDownloadCommitMessage("");
  }
};
// 🧭 UI Toolbar Section
return (
  <div className="flex flex-col gap-2">
    {/* ==== Top Connection + Toolbar ==== */}
    <div className="flex flex-wrap items-center justify-between gap-y-2">
      {/* 🔌 Connection Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span
          aria-label={isReady ? "connected" : "connecting"}
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            isReady ? "bg-green-500" : "bg-amber-500 animate-pulse"
          }`}
        />
        <span>{isReady ? "Connected (Firebase)" : "Connecting..."}</span>
      </div>

      {/* ==== 🧰 Toolbar Buttons ==== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 🪄 Summarize */}
        <Button
          type="button"
          variant="outline"
          onClick={handleSummarize}
          disabled={!isReady || isSummarizing}
        >
          <RiMagicLine className="h-4 w-4 mr-1" />
          {isSummarizing ? "Summarizing..." : "Summarize"}
        </Button>

        {/* 🔍 Check Plagiarism */}
        <Button
          type="button"
          onClick={() => setShowSummaryDialog(true)}
          disabled={!isReady || isCheckingPlagiarism}
          variant="secondary"
        >
          <RiSearchEyeLine className="h-4 w-4 mr-1" />
          {isCheckingPlagiarism ? "Checking..." : "Check Plagiarism"}
        </Button>

        {/* 💾 Save Snapshot */}
        <Button
          type="button"
          onClick={handleSaveSnapshot}
          disabled={!isReady || isSavingSnapshot}
        >
          <RiSaveLine className="h-4 w-4 mr-1" />
          {isSavingSnapshot ? "Saving..." : "Save Snapshot"}
        </Button>

        {/* 📄 Download PDF */}
        <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadClick}
              disabled={!isReady || downloading}
            >
              <RiDownloadLine className="h-4 w-4 mr-1" />
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-72">
            <div className="space-y-2 text-sm">
              <div className="font-medium">Download PDF</div>
              <p className="text-muted-foreground">
                Save a new snapshot with a commit message, then download it as a PDF.
              </p>

              <div className="space-y-1">
                <label className="text-xs">Commit message</label>
                <Textarea
                  rows={2}
                  value={downloadCommitMessage}
                  onChange={(e) => setDownloadCommitMessage(e.target.value)}
                  placeholder="e.g., Exporting current draft"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDownloadOpen(false)}
                  disabled={downloading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void saveSnapshotAndDownload()}
                  disabled={downloading || !downloadCommitMessage.trim()}
                >
                  {downloading ? "Saving…" : "Save & Download"}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 🔊 Text-to-Speech */}
        {!isSpeaking ? (
          <Button
            type="button"
            variant="outline"
            onClick={startTTS}
            disabled={!isReady}
          >
            <RiVolumeUpLine className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stopTTS}>
            <RiStopLine className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>




{/* 📝 Editor Area */}
<div className="relative mt-2">
  <div ref={containerRef} className="min-h-[400px]" />

  {isListening && (
    <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/70 backdrop-blur border rounded px-3 py-2">
      <div className="relative h-3 w-3">
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
        <span className="absolute inset-0 rounded-full bg-red-500" />
      </div>
      <span className="text-xs text-muted-foreground">
        Listening… {interim && <em className="opacity-70">{interim}</em>}
      </span>
    </div>
  )}
</div>

{/* 🎧 Hidden Audio Input */}
<input
  ref={fileInputRef}
  type="file"
  accept="audio/*"
  onChange={handleAudioSelected}
  className="hidden"
/>

{/* 🧠 Summary Dialog */}
<Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Summary</DialogTitle>
      <DialogDescription>
        Generated by AI. You can insert it into the document.
      </DialogDescription>
    </DialogHeader>

    <div className="prose prose-sm dark:prose-invert max-w-none bg-muted p-3 rounded max-h-72 overflow-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {summaryText || "No summary."}
      </ReactMarkdown>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setShowSummaryDialog(false)}
      >
        Close
      </Button>

      <Button
        onClick={() => {
          try {
            const q = quillRef.current;
if (!q) return;

const range = q.getSelection();
const insertAt = range ? range.index + range.length : q.getLength();

q.insertText(insertAt, `\nSummary:\n${summaryText}\n`, "silent");

          } catch (err) {
            console.error("Insert summary failed:", err);
          }
          setShowSummaryDialog(false);
        }}
      >
        Insert into editor
      </Button>

      <Button
        variant="secondary"
        onClick={handlePlagiarismCheck}
        disabled={isCheckingPlagiarism}
      >
        {isCheckingPlagiarism ? "Checking..." : "Check Plagiarism"}
      </Button>
    </DialogFooter>
  </DialogContent>

{/* 📄 Plagiarism Insight */}
{plagiarismResult && (
  <div
    className={`mt-6 p-6 rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-500 ${
      plagiarismResult.plagiarism_status === "Likely Copied"
        ? "border-red-500/40 bg-gradient-to-br from-red-950/60 to-black/40 text-red-200"
        : plagiarismResult.plagiarism_status === "Mostly Original"
        ? "border-yellow-500/40 bg-gradient-to-br from-yellow-950/60 to-black/40 text-yellow-200"
        : "border-violet-500/40 bg-gradient-to-br from-violet-950/60 to-black/40 text-violet-200"
    }`}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-violet-300 flex items-center gap-2">
        <span><strong>Plagiarism Report</strong></span>
      </h3>

      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          plagiarismResult.confidence > 70
            ? "bg-red-600/40 text-red-300"
            : plagiarismResult.confidence > 40
            ? "bg-yellow-600/40 text-yellow-200"
            : "bg-green-600/40 text-green-200"
        }`}
      >
        {plagiarismResult.confidence > 70
          ? "⚠️ High Plagiarism Risk"
          : plagiarismResult.confidence > 40
          ? "🟡 Moderate Similarity"
          : "🟢 Highly Original"}
      </span>
    </div>

    {/* Originality Analysis */}
    <div className="space-y-3 text-sm leading-relaxed">
      <div>
        <p className="font-medium text-gray-300 mb-1">🧩 Originality Analysis:</p>
        <p className="text-gray-400">
          {plagiarismResult.confidence > 70
            ? "Your document shows strong resemblance to known content patterns. Consider rephrasing or citing sources."
            : plagiarismResult.confidence > 40
            ? "Some portions may share conceptual or linguistic overlap with existing texts. Review phrasing for uniqueness."
            : "Your content appears uniquely phrased and contextually original."}
        </p>
      </div>

      <div>
        <p className="font-medium text-gray-300 mb-1">📋 AI Observations:</p>
        <ul className="list-disc ml-5 text-gray-400 space-y-1">
          <li>{plagiarismResult.indicators}</li>
          {plagiarismResult.confidence > 70 && (
            <li>Multiple identical sentence structures detected.</li>
          )}
          {plagiarismResult.confidence > 40 && (
            <li>Similar themes or phrasing found in related project summaries.</li>
          )}
          {plagiarismResult.confidence < 40 && (
            <li>Distinct vocabulary and sentence formation detected.</li>
          )}
        </ul>
      </div>

      {/* Gauge Bar */}
      <div>
        <p className="font-medium text-gray-300 mb-1">📈 Originality Level:</p>

        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-in-out ${
              plagiarismResult.confidence > 70
                ? "bg-red-500"
                : plagiarismResult.confidence > 40
                ? "bg-yellow-400"
                : "bg-violet-500"
            }`}
            style={{ width: `${100 - plagiarismResult.confidence}%` }}
          ></div>
        </div>

        <p className="text-xs text-gray-400 mt-1 italic">
          {100 - plagiarismResult.confidence}% estimated originality
                </p>
      </div>
    </div>
  </div>
)}
</Dialog>
