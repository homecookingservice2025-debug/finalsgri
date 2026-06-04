import React, { useState, useEffect, useRef } from "react";
import { 
  QrCode, Smartphone, Wifi, WifiOff, RefreshCcw, LogOut, Trash2, Edit,
  Send, Users, FileSpreadsheet, Plus, HelpCircle, BarChart3, AlertCircle,
  FileText, CheckCircle, Clock, Check, ShieldAlert, ChevronRight, X, Play, Loader2,
  Database, UploadCloud, Copy, Sparkles, Cake, Heart, PieChart, TrendingUp, Info, ShieldX, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, 
  BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  AreaChart, Area
} from "recharts";
import { HospitalEntry, DairyEntry } from "../types";

interface WhatsAppAccount {
  id: number;
  name: string;
  phone: string | null;
  status: "disconnected" | "connecting" | "connected";
  qr_code: string | null;
  user_id: string;
  created_at: string;
}

interface Campaign {
  id: number;
  name: string;
  account_id: number;
  message: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  status: "pending" | "processing" | "completed" | "paused";
  delay_seconds: number;
  created_at: string;
}

interface MessageLog {
  id: number;
  campaign_id: number | null;
  recipient_name: string;
  recipient_phone: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

interface WhatsAppCRMProps {
  hospitalEntries?: HospitalEntry[];
  dairyEntries?: DairyEntry[];
  activeModule?: 'Hospital' | 'Dairy';
}

export default function WhatsAppCRM({
  hospitalEntries = [],
  dairyEntries = [],
  activeModule = "Hospital"
}: WhatsAppCRMProps) {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [docsInvoices, setDocsInvoices] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "accounts" | "campaigns" | "direct" | "history" | "reports">("dashboard");
  const [reportsFilter, setReportsFilter] = useState<string>("all");
  const [reportsSearchTerm, setReportsSearchTerm] = useState<string>("");
  const [reportsSenderFilter, setReportsSenderFilter] = useState<string>("all");
  const [webhookMessageId, setWebhookMessageId] = useState<string>("");
  const [webhookSimulationStatus, setWebhookSimulationStatus] = useState<string>("seen");
  const [blockedPopupUrl, setBlockedPopupUrl] = useState<string | null>(null);
  const [blockedPopupName, setBlockedPopupName] = useState<string>("");
  const [attachmentGuide, setAttachmentGuide] = useState<{ phone: string, name: string, message: string, media: any } | null>(null);

  // Editing overlays
  const [editingAccount, setEditingAccount] = useState<WhatsAppAccount | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);

  // Form input states for editing
  const [editAccName, setEditAccName] = useState("");
  const [editAccPhone, setEditAccPhone] = useState("");

  const [editCampName, setEditCampName] = useState("");
  const [editCampMsg, setEditCampMsg] = useState("");
  const [editCampDelay, setEditCampDelay] = useState(5);

  const [editDocName, setEditDocName] = useState("");
  const [editDocPhone, setEditDocPhone] = useState("");
  const [editDocAmount, setEditDocAmount] = useState("");
  const [editDocItems, setEditDocItems] = useState("");
  const [editDocRef, setEditDocRef] = useState("");
  const [editDocStatus, setEditDocStatus] = useState("sent");

  // Account creation state
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPhone, setNewAccountPhone] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [generatingQRFor, setGeneratingQRFor] = useState<number | null>(null);
  const [pairingQR, setPairingQR] = useState<string | null>(null);
  const [manualPairPhone, setManualPairPhone] = useState("");
  const [isManualPairing, setIsManualPairing] = useState(false);

  // Campaign builder state
  const [campaignName, setCampaignName] = useState("");
  const [campaignAccount, setCampaignAccount] = useState("");
  const [campaignTemplate, setCampaignTemplate] = useState("Hello {{name}}, we're happy to connect with you!");
  const [campaignContacts, setCampaignContacts] = useState<{ name: string; phone: string }[]>([]);
  const [campaignDelay, setCampaignDelay] = useState(5); // anti-ban delay
  const [importText, setImportText] = useState("");
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  // New features: Contacts sourcing state and handlers
  const [contactsSourceTab, setContactsSourceTab] = useState<"database" | "excel" | "paste">("database");

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length <= 1) {
          toast.error("Spreadsheet appears to be empty.");
          return;
        }

        // Try to find columns for phone and name
        const headers = (data[0] as any[] || []).map(h => String(h).toLowerCase().trim());
        let phoneIndex = -1;
        let nameIndex = -1;

        headers.forEach((val, index) => {
          if (val.includes("phone") || val.includes("mobile") || val.includes("number") || val.includes("contact") || val.includes("no") || val.includes("tel")) {
            phoneIndex = index;
          }
          if (val.includes("name") || val.includes("client") || val.includes("customer") || val.includes("patient") || val.includes("farmer") || val.includes("user")) {
            nameIndex = index;
          }
        });

        // fallback to columns 0 and 1 if not found
        if (phoneIndex === -1 && headers.length > 0) phoneIndex = 0;
        if (nameIndex === -1 && headers.length > 1) nameIndex = 1;

        const parsed: { name: string; phone: string }[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (!row || row.length === 0) continue;

          const phoneVal = phoneIndex !== -1 ? String(row[phoneIndex] || "").trim() : "";
          const nameVal = nameIndex !== -1 ? String(row[nameIndex] || "").trim() : "";

          const phoneClean = phoneVal.replace(/\D/g, "");
          const nameClean = nameVal || `Customer ${phoneClean.slice(-4)}`;

          if (phoneClean.length >= 9) {
            parsed.push({ name: nameClean, phone: phoneClean });
          }
        }

        if (parsed.length === 0) {
          toast.error("Could not parse any valid phone numbers. Ensure mobile/phone numbers are present.");
        } else {
          setCampaignContacts(parsed);
          toast.success(`Imported ${parsed.length} contacts from spreadsheet!`, { icon: "📈" });
        }
      } catch (err) {
        console.error(err);
        toast.error("Error reading file. Make sure it is a valid spreadsheet file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLoadFromDatabase = (source: "hospital" | "dairy" | "all") => {
    let combined: { name: string; phone: string }[] = [];

    const formatEntry = (item: any) => {
      const phoneClean = (item.phone || "").replace(/\D/g, "");
      return {
        name: item.name || "Customer",
        phone: phoneClean
      };
    };

    if (source === "hospital" || source === "all") {
      hospitalEntries.forEach(item => {
        const parsed = formatEntry(item);
        if (parsed.phone.length >= 9) {
          combined.push(parsed);
        }
      });
    }

    if (source === "dairy" || source === "all") {
      dairyEntries.forEach(item => {
        const parsed = formatEntry(item);
        if (parsed.phone.length >= 9) {
          combined.push(parsed);
        }
      });
    }

    if (combined.length === 0) {
      toast.error(`No contacts found in selected database tab (${source}).`);
      return;
    }

    setCampaignContacts(combined);
    toast.success(`Loaded ${combined.length} contacts from database records!`, { icon: "📥" });
  };

  // Direct send message state
  const [directPhone, setDirectPhone] = useState("");
  const [directName, setDirectName] = useState("");
  const [directMessage, setDirectMessage] = useState("");
  const [selectedDocType, setSelectedDocType] = useState<"text" | "invoice" | "receipt" | "birthday_card">("text");
  const [directMessageStatus, setDirectMessageStatus] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  const isBirthdayToday = (dob?: string) => {
    if (!dob || dob.length < 5) return false;
    try {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    } catch {
      return false;
    }
  };

  const isAnniversaryToday = (anniversary?: string) => {
    if (!anniversary || anniversary.length < 5) return false;
    try {
      const d = new Date(anniversary);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    } catch {
      return false;
    }
  };

  const handleSelectContact = (contact: any) => {
    setDirectName(contact.name);
    setDirectPhone(contact.phone || "");
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);

    const nameVal = contact.name || "";
    const isBday = isBirthdayToday(contact.dob);
    const isAnniv = isAnniversaryToday(contact.anniversary);

    if (isBday) {
      setSelectedDocType("birthday_card");
      setDirectMessage(`Happy Birthday ${nameVal}! Wishing you a super prosperous year filled with premium milestones and fantastic health! 🎂🎈`);
      setDirectMessageStatus(`🎉 ${nameVal} has a birthday today! Greeting template auto-applied.`);
      toast.success(`Today is ${nameVal}'s Birthday! Greeting applied.`);
    } else if (isAnniv) {
      setSelectedDocType("birthday_card");
      setDirectMessage(`Happy Anniversary ${nameVal}! Wishing you a gorgeous day and continuous love, health, and prosperity! 💍✨`);
      setDirectMessageStatus(`💍 ${nameVal} has an anniversary today! Celebration template auto-applied.`);
      toast.success(`Today is ${nameVal}'s Anniversary! Celebration applied.`);
    } else if (contact.dob) {
      setSelectedDocType("birthday_card");
      setDirectMessage(`Happy Birthday ${nameVal}! Wishing you a super prosperous year filled with premium milestones and fantastic health! 🎂🎈`);
      setDirectMessageStatus(`🎉 DOB recorded: ${contact.dob}. Greeting template pre-filled.`);
      toast.success(`Greeting pre-filled for ${nameVal}'s Birthday!`);
    } else if (contact.anniversary) {
      setSelectedDocType("birthday_card");
      setDirectMessage(`Happy Anniversary ${nameVal}! Wishing you a gorgeous day and continuous love, health, and prosperity! 💍✨`);
      setDirectMessageStatus(`💍 Anniversary recorded: ${contact.anniversary}. Celebration template pre-filled.`);
      toast.success(`Greeting pre-filled for ${nameVal}'s Anniversary!`);
    } else {
      setDirectMessageStatus(`👤 Customer record found: ${nameVal}`);
    }
  };

  const handleCRMDirectNameChange = (nameVal: string) => {
    setDirectName(nameVal);
    if (nameVal.trim().length < 3) {
      setDirectMessageStatus("");
      return;
    }
    const allEntries = [...(hospitalEntries || []), ...(dairyEntries || [])];
    const match = allEntries.find(e => 
      String(e.name || '').toLowerCase() === nameVal.trim().toLowerCase()
    );

    if (match) {
      const phoneVal = match.phone || "";
      setDirectPhone(phoneVal);
      const isBday = isBirthdayToday(match.dob);
      const isAnniv = isAnniversaryToday(match.anniversary);

      if (isBday) {
        setSelectedDocType("birthday_card");
        setDirectMessage("Happy Birthday! Wishing you a super prosperous year filled with premium milestones and fantastic health! 🎂🎈");
        setDirectMessageStatus(`🎉 ${match.name} has a birthday today! Greeting template auto-applied.`);
        toast.success(`Today is ${match.name}'s Birthday! Greeting applied.`);
      } else if (isAnniv) {
        setSelectedDocType("birthday_card");
        setDirectMessage("Happy Anniversary! Wishing you a gorgeous day and continuous love, health, and prosperity! 💍✨");
        setDirectMessageStatus(`💍 ${match.name} has an anniversary today! Celebration template auto-applied.`);
        toast.success(`Today is ${match.name}'s Anniversary! Celebration applied.`);
      } else {
        setDirectMessageStatus(`👤 Customer record found: ${match.name}`);
      }
    }
  };

  const handleCRMDirectPhoneChange = (phoneVal: string) => {
    setDirectPhone(phoneVal);
    const cleanTyped = phoneVal.replace(/\D/g, "");
    if (cleanTyped.length < 5) {
      setDirectMessageStatus("");
      return;
    }
    const allEntries = [...(hospitalEntries || []), ...(dairyEntries || [])];
    const match = allEntries.find(e => {
      const cleanE = String(e.phone || '').replace(/\D/g, "");
      return cleanE.length >= 8 && (cleanTyped.endsWith(cleanE) || cleanE.endsWith(cleanTyped));
    });

    if (match) {
      const nameVal = match.name || "";
      setDirectName(nameVal);
      const isBday = isBirthdayToday(match.dob);
      const isAnniv = isAnniversaryToday(match.anniversary);

      if (isBday) {
        setSelectedDocType("birthday_card");
        setDirectMessage("Happy Birthday! Wishing you a super prosperous year filled with premium milestones and fantastic health! 🎂🎈");
        setDirectMessageStatus(`🎉 ${nameVal} has a birthday today! Greeting template auto-applied.`);
        toast.success(`Today is ${nameVal}'s Birthday! Greeting applied.`);
      } else if (isAnniv) {
        setSelectedDocType("birthday_card");
        setDirectMessage("Happy Anniversary! Wishing you a gorgeous day and continuous love, health, and prosperity! 💍✨");
        setDirectMessageStatus(`💍 ${nameVal} has an anniversary today! Celebration template auto-applied.`);
        toast.success(`Today is ${nameVal}'s Anniversary! Celebration applied.`);
      } else {
        setDirectMessageStatus(`👤 Customer record found: ${nameVal}`);
      }
    } else {
      setDirectMessageStatus("");
    }
  };

  // Document/PDF variables
  const [docAmount, setDocAmount] = useState("1250.00");
  const [docItems, setDocItems] = useState("Consultation Fees");
  const [docTax, setDocTax] = useState("45.00");
  const [docReference, setDocReference] = useState("TXN-382910");

  // Birthday card & media integration variables
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [selectedMediaForCampaign, setSelectedMediaForCampaign] = useState<any | null>(null);
  const [selectedMediaForDirect, setSelectedMediaForDirect] = useState<any | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const copyImageToClipboard = async (base64Data: string, mimeType: string) => {
    try {
      const response = await fetch(base64Data);
      let blob = await response.blob();

      // Ensure blob matches image/png since browser ClipboardItem is most compatible with PNG
      if (!mimeType.includes("png")) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = base64Data;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (pngBlob) {
            blob = pngBlob;
          }
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob
        })
      ]);
      toast.success("Design card successfully copied to your Clipboard! Just paste (Ctrl+V) directly in WhatsApp chat.");
      return true;
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      toast.error("Failed to copy image to clipboard automatically. Please download it instead.");
      return false;
    }
  };

  const downloadMediaFile = (base64Data: string, filename: string) => {
    try {
      const link = document.createElement("a");
      link.href = base64Data;
      link.download = filename || "celebration_card.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded: ${filename || "card"}`);
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleDirectMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "campaign" | "direct") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit. Please upload a compressed image, GIF, or video.");
      return;
    }

    setIsUploadingMedia(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: activeModule,
            name: file.name,
            type: file.type,
            data: base64
          })
        });
        if (res.ok) {
          const result = await res.json();
          const newMedia = {
            id: result.id,
            module: activeModule,
            name: file.name,
            type: file.type,
            data: base64,
            created_at: new Date().toISOString()
          };
          toast.success("Celebration media card uploaded!", { icon: "🎨" });
          
          skuRefreshMedia();
          
          if (target === "campaign") {
            setSelectedMediaForCampaign(newMedia);
          } else {
            setSelectedMediaForDirect(newMedia);
          }
        } else {
          toast.error("Failed to upload birthday media.");
        }
      } catch (err) {
        toast.error("Failed to store media server-side.");
      } finally {
        setIsUploadingMedia(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const skuRefreshMedia = async () => {
    try {
      const mediaRes = await fetch(`/api/media/${activeModule}`);
      if (mediaRes.ok) {
        setMediaItems(await mediaRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchCRMData();

    // Setup Socket.IO listener
    let socketUrl: string | undefined = undefined;
    const isDevOrPreview = window.location.hostname.includes('run.app') || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
                           
    if (!isDevOrPreview) {
      const rawUrl = (import.meta as any).env.VITE_API_URL || '';
      socketUrl = rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('your-ubuntu-vps-ip') ? rawUrl : undefined;
    }
    const socketOptions = socketUrl ? { path: '/socket.io' } : undefined;
    const socket = io(socketUrl, socketOptions);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket linked to analytical socket gateway.");
    });

    // Listen to campaign dispatches
    socket.onAny((event, data) => {
      if (event.startsWith("whatsapp:qr:")) {
        const accId = parseInt(event.split(":")[2]);
        setAccounts(prev => prev.map(a => a.id === accId ? { ...a, status: "connecting", qr_code: data.qr } : a));
        if (generatingQRFor === accId) {
          setPairingQR(data.qr);
        }
      }
      else if (event.startsWith("whatsapp:connecting:")) {
        const accId = parseInt(event.split(":")[2]);
        setAccounts(prev => prev.map(a => a.id === accId ? { ...a, status: "connecting" } : a));
      }
      else if (event.startsWith("whatsapp:connected:")) {
        const accId = parseInt(event.split(":")[2]);
        setAccounts(prev => prev.map(a => a.id === accId ? { ...a, status: "connected", phone: data.phone, qr_code: null } : a));
        if (generatingQRFor === accId) {
          toast.success(`Success! Connected to phone ${data.phone}`, { icon: "✅" });
          setGeneratingQRFor(null);
          setPairingQR(null);
        }
        fetchCRMData();
      }
      else if (event.startsWith("campaign:progress:")) {
        const { campaignId, sentCount, failedCount, currentContact, percentage } = data;
        setCampaigns(prev => prev.map(c => String(c.id) === String(campaignId) ? { ...c, sent_count: sentCount, failed_count: failedCount, status: "processing" } : c));
      }
      else if (event.startsWith("campaign:status:")) {
        if (data.status === "completed") {
          toast.success(`Campaign completed! Sent: ${data.sentCount}, Failed: ${data.failedCount}`);
          fetchCRMData();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [generatingQRFor]);

  // Synchronize edit account values
  useEffect(() => {
    if (editingAccount) {
      setEditAccName(editingAccount.name);
      setEditAccPhone(editingAccount.phone || "");
    }
  }, [editingAccount]);

  // Synchronize edit campaign values
  useEffect(() => {
    if (editingCampaign) {
      setEditCampName(editingCampaign.name);
      setEditCampMsg(editingCampaign.message);
      setEditCampDelay(editingCampaign.delay_seconds || 5);
    }
  }, [editingCampaign]);

  // Synchronize edit document/invoice values
  useEffect(() => {
    if (editingDoc) {
      setEditDocName(editingDoc.recipient_name);
      setEditDocPhone(editingDoc.recipient_phone);
      setEditDocAmount(editingDoc.amount || "");
      setEditDocItems(editingDoc.items || "");
      setEditDocRef(editingDoc.reference || "");
      setEditDocStatus(editingDoc.status || "sent");
    }
  }, [editingDoc]);

  const fetchCRMData = async () => {
    try {
      const [accRes, campRes, logsRes, mediaRes, docsRes] = await Promise.all([
        fetch("/api/whatsapp/accounts"),
        fetch("/api/whatsapp/campaigns"),
        fetch("/api/whatsapp/messages"),
        fetch(`/api/media/${activeModule}`),
        fetch("/api/whatsapp/docs")
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (mediaRes.ok) setMediaItems(await mediaRes.json());
      if (docsRes.ok) setDocsInvoices(await docsRes.json());
    } catch (err) {
      console.error("Failed to load WhatsApp state database records", err);
    }
  };

  // Helper to resolve which WhatsApp account a message log came from
  const getSenderInfo = (logMessage: MessageLog) => {
    if (logMessage.campaign_id) {
      const camp = campaigns.find(c => String(c.id) === String(logMessage.campaign_id));
      if (camp) {
        const acc = accounts.find(a => String(a.id) === String(camp.account_id));
        if (acc) {
          return {
            id: acc.id,
            name: acc.name,
            phone: acc.phone || "No Number paired",
            status: acc.status
          };
        }
      }
    }
    // Default account fallback
    const fallbackAcc = accounts.find(a => a.status === "connected") || accounts[0];
    if (fallbackAcc) {
      return {
        id: fallbackAcc.id,
        name: fallbackAcc.name,
        phone: fallbackAcc.phone || "919001234567",
        status: fallbackAcc.status
      };
    }
    return {
      id: 1,
      name: "Marketing Line",
      phone: "919001234567",
      status: "connected"
    };
  };

  const getSenderAccountStats = () => {
    return accounts.map(acc => {
      const campIds = campaigns.filter(c => String(c.account_id) === String(acc.id)).map(c => c.id);
      const isFallbackDefault = acc.status === "connected" || (accounts.length > 0 && accounts[0].id === acc.id);
      const accLogs = logs.filter(log => {
        if (log.campaign_id) {
          return campIds.map(String).includes(String(log.campaign_id));
        } else {
          return isFallbackDefault;
        }
      });

      const total = accLogs.length;
      const seen = accLogs.filter(l => l.status === "seen").length;
      const unseen = accLogs.filter(l => l.status === "unseen").length;
      const delivered = accLogs.filter(l => l.status === "delivered" || l.status === "sent").length;
      const metricsTotal = total || 1; // avoid division by 0
      
      return {
        id: acc.id,
        name: acc.name,
        phone: acc.phone || "No pairing phone",
        status: acc.status,
        total,
        seen,
        unseen,
        delivered,
        blocked: accLogs.filter(l => l.status === "blocked").length,
        deleted: accLogs.filter(l => l.status === "deleted").length,
        successRate: Math.round(((seen + unseen + delivered) / metricsTotal) * 100),
        seenRate: Math.round((seen / metricsTotal) * 100),
        blockRate: Math.round((accLogs.filter(l => l.status === "blocked").length / metricsTotal) * 100)
      };
    });
  };

  const handleTriggerWebhook = async () => {
    if (!webhookMessageId) {
      toast.error("Please select a tracking message row to mock!");
      return;
    }

    const selectedLog = logs.find(l => String(l.id) === String(webhookMessageId));
    if (!selectedLog) return;

    try {
      const res = await fetch(`/api/whatsapp/messages/${webhookMessageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: webhookSimulationStatus,
          error_message: webhookSimulationStatus === "blocked" ? "Contact blocked the WhatsApp sender line" : null
        })
      });

      if (res.ok) {
        toast.success(`Success! Webhook receipt received: Message to "${selectedLog.recipient_name}" updated to "${webhookSimulationStatus}" status.`, {
          icon: "🔔",
          duration: 4000
        });
        fetchCRMData(); // Reload logs dynamically
      } else {
        toast.error("Failed to run simulation webhook event.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error invoking webhook API route");
    }
  };

  const downloadReportsCSV = () => {
    if (logs.length === 0) return toast.error("No reports to export");
    const dataToExport = logs.map(l => ({
      "Recipient Name": l.recipient_name,
      "Phone Number": l.recipient_phone,
      "Message Content": l.message,
      "Status": l.status,
      "Sent At": l.sent_at || ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Delivery Status Audit");
    XLSX.writeFile(workbook, `WhatsApp_Delivery_Report_${activeModule}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Delivery status report downloaded successfully!");
  };

  const downloadReportsPDF = () => {
    if (logs.length === 0) return toast.error("No reports to export");
    try {
      const doc = new jsPDF("l", "mm", "a4");
      doc.setFontSize(14);
      doc.text(`WhatsApp Delivery Status Audit Report - ${activeModule}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated at: ${new Date().toLocaleString()}`, 14, 21);

      const headers = ["Recipient Name", "Phone Number", "Message Content", "Status", "Sent At"];
      const rows = logs.map(l => [
        l.recipient_name,
        l.recipient_phone,
        l.message,
        l.status,
        new Date(l.sent_at || l.created_at || "").toLocaleString()
      ]);

      autoTable(doc, {
        startY: 25,
        head: [headers],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [16, 185, 129] }, // emerald emerald-500 style
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });

      doc.save(`WhatsApp_Delivery_Report_${activeModule}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Delivery status report downloaded as PDF successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF audit report.");
    }
  };

  const handleUpdateAccount = async (accountId: number, name: string, phone: string) => {
    try {
      const res = await fetch(`/api/whatsapp/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
      });
      if (res.ok) {
        toast.success("WhatsApp Line successfully updated.");
        setEditingAccount(null);
        fetchCRMData();
      } else {
        toast.error("Failed to update account.");
      }
    } catch (err) {
      toast.error("Error updating account.");
    }
  };

  const handleUpdateCampaign = async (campaignId: number, name: string, message: string, delaySeconds: number) => {
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, delay_seconds: delaySeconds })
      });
      if (res.ok) {
        toast.success("Campaign updated successfully.");
        setEditingCampaign(null);
        fetchCRMData();
      } else {
        toast.error("Failed to update campaign.");
      }
    } catch (err) {
      toast.error("Error updating campaign.");
    }
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!window.confirm("Permanently delete this campaign and cancel any active queue?")) return;
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Campaign record removed.");
        fetchCRMData();
      } else {
        toast.error("Failed to delete campaign.");
      }
    } catch (err) {
      toast.error("Error deleting campaign.");
    }
  };

  const handleUpdateDoc = async (docId: number, name: string, phone: string, amount: string, items: string, ref: string, status?: string) => {
    try {
      const res = await fetch(`/api/whatsapp/docs/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: name,
          recipient_phone: phone,
          doc_type: editingDoc?.doc_type || "invoice",
          amount,
          items,
          reference: ref,
          status: status || "sent"
        })
      });
      if (res.ok) {
        toast.success("Document record saved and updated.");
        setEditingDoc(null);
        fetchCRMData();
      } else {
        toast.error("Failed to update document.");
      }
    } catch (err) {
      toast.error("Error updating document.");
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm("Delete this smart document or invoice record permanently from database?")) return;
    try {
      const res = await fetch(`/api/whatsapp/docs/${docId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Document record deleted.");
        fetchCRMData();
      } else {
        toast.error("Failed to delete document.");
      }
    } catch (err) {
      toast.error("Error deleting document.");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName) return;
    setIsCreatingAccount(true);

    try {
      const res = await fetch("/api/whatsapp/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newAccountName,
          phone: newAccountPhone || undefined
        })
      });
      if (res.ok) {
        toast.success("Account created successfully!");
        setNewAccountName("");
        setNewAccountPhone("");
        setIsCreatingAccount(false);
        fetchCRMData();
      }
    } catch (err) {
      toast.error("Failed to initialize account registry.");
      setIsCreatingAccount(false);
    }
  };

  const handleManualLink = async (accountId: number, phoneStr: string) => {
    if (!phoneStr.trim()) {
      toast.error("Please enter a phone number first.");
      return;
    }
    setIsManualPairing(true);
    try {
      const res = await fetch(`/api/whatsapp/accounts/${accountId}/manual-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneStr })
      });
      if (res.ok) {
        toast.success("Linked phone number successfully!");
        setGeneratingQRFor(null);
        setPairingQR(null);
        setManualPairPhone("");
        fetchCRMData();
      } else {
        toast.error("Failed to link phone number manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during manual pairing.");
    } finally {
      setIsManualPairing(false);
    }
  };

  const handleCancelConnection = async (accountId: number) => {
    setGeneratingQRFor(null);
    setPairingQR(null);
    setManualPairPhone("");
    try {
      await fetch(`/api/whatsapp/accounts/${accountId}/cancel-connect`, { method: "POST" });
    } catch (e) {
      console.error("Cancel failed:", e);
    }
  };

  const startConnectionFlow = async (id: number) => {
    setGeneratingQRFor(id);
    setPairingQR(null);
    try {
      await fetch(`/api/whatsapp/accounts/${id}/connect`, { method: "POST" });
      toast.success("Generating connection QR code standard token...", { icon: "⏳" });
    } catch (err) {
      toast.error("Endpoint paired session failed.");
    }
  };

  const handleDisconnect = async (id: number) => {
    try {
      const res = await fetch(`/api/whatsapp/accounts/${id}/disconnect`, { method: "POST" });
      if (res.ok) {
        toast.success("Session logged out gracefully.");
        fetchCRMData();
      }
    } catch (err) {
      toast.error("Failed to disconnect.");
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm("Delete this WhatsApp account connection records permanently? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/whatsapp/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted.");
        fetchCRMData();
      }
    } catch (err) {
      toast.error("Failed to delete account registry.");
    }
  };

  const handleImportContacts = () => {
    if (!importText) {
      toast.error("Enter contact strings in the parser block.");
      return;
    }
    // Parses name and number separated by commas or newlines
    const rows = importText.split("\n");
    const parsed: { name: string; phone: string }[] = [];
    rows.forEach(row => {
      const parts = row.split(",");
      if (parts.length >= 1) {
        const phoneClean = parts[0].replace(/\D/gs, "");
        const nameClean = parts[1] ? parts[1].trim() : `Customer ${phoneClean.slice(-4)}`;
        if (phoneClean.length >= 9) {
          parsed.push({ name: nameClean, phone: phoneClean });
        }
      }
    });

    if (parsed.length === 0) {
      toast.error("Failed to parse valid phone formats. Ensure CSV values are 'phone,name' format.");
    } else {
      setCampaignContacts(parsed);
      toast.success(`Parsed ${parsed.length} contacts successfully!`);
    }
  };

  const clearContacts = () => {
    setCampaignContacts([]);
    setImportText("");
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !campaignAccount || !campaignTemplate || campaignContacts.length === 0) {
      toast.error("Please fill in all campaign fields and import targets.");
      return;
    }
    setIsLaunchingCampaign(true);

    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          account_id: campaignAccount,
          message: campaignTemplate,
          contacts: campaignContacts,
          delay_seconds: campaignDelay,
          media: selectedMediaForCampaign ? {
            name: selectedMediaForCampaign.name,
            type: selectedMediaForCampaign.type,
            data: selectedMediaForCampaign.data,
            url: selectedMediaForCampaign.data
          } : null
        })
      });

      if (res.ok) {
        toast.success("Campaign thread dispatching started!", { icon: "🚀" });
        setCampaignName("");
        setCampaignTemplate("Hello {{name}}, we're happy to connect with you!");
        setCampaignContacts([]);
        setImportText("");
        setSelectedMediaForCampaign(null);
        setIsLaunchingCampaign(false);
        setActiveSubTab("dashboard");
        fetchCRMData();
      }
    } catch (err) {
      toast.error("Failed to launch campaign.");
      setIsLaunchingCampaign(false);
    }
  };

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone || !directName) {
      toast.error("Verify name and phone number inputs.");
      return;
    }

    let finalMessage = directMessage;

    if (selectedDocType === "invoice") {
      finalMessage = `🧾 *INVOICE DOCUMENT*\nReference: ${docReference}\nTo: ${directName}\nItem: ${docItems}\nAmount: Rs. ${docAmount}\nTax included: Rs. ${docTax}\nStatus: *PENDING PAYMENT*\n\n${directMessage}`;
    } else if (selectedDocType === "receipt") {
      finalMessage = `✅ *PAYMENT RECEIPT*\nRef Check: ${docReference}\nFrom: ${directName}\nService: ${docItems}\nPaid sum: Rs. ${docAmount}\nTax deduction: Rs. ${docTax}\nStatus: *SUCCESSFULLY COMPLETED*\n\nThank you for choosing us!`;
    } else if (selectedDocType === "birthday_card") {
      if (!selectedMediaForDirect) {
        toast.error("Please select or upload a birthday/celebration card media to send.");
        return;
      }
      finalMessage = `🎉 *CELEBRATION MESSAGE*\nFrom: Shri Krishna ${activeModule} Admin\nTo: ${directName}\nGreetings: ${directMessage || "Happy Birthday / Anniversary! Wishing you endless bliss and premium success."}`;
    }

    try {
      // Save compiled document record
      await fetch("/api/whatsapp/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: directName,
          recipient_phone: directPhone,
          doc_type: selectedDocType,
          amount: selectedDocType === "invoice" || selectedDocType === "receipt" ? docAmount : null,
          items: selectedDocType === "invoice" || selectedDocType === "receipt" ? docItems : null,
          reference: selectedDocType === "invoice" || selectedDocType === "receipt" ? docReference : null,
          message: directMessage
        })
      });

      const res = await fetch("/api/whatsapp/send-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: directName,
          phone: directPhone,
          message: finalMessage,
          media: selectedMediaForDirect ? {
            name: selectedMediaForDirect.name,
            type: selectedMediaForDirect.type,
            data: selectedMediaForDirect.data,
            url: selectedMediaForDirect.data
          } : null
        })
      });

      if (res.ok) {
        toast.success("Direct message registered successfully!");
        
        let cleanPhone = String(directPhone).replace(/\D/g, "");
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = cleanPhone.substring(1);
        }
        if (cleanPhone.length === 10) {
          cleanPhone = "91" + cleanPhone;
        }
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

        if (selectedMediaForDirect) {
          // Open the beautiful attachment guide overlay!
          setAttachmentGuide({
            phone: cleanPhone,
            name: directName,
            message: finalMessage,
            media: selectedMediaForDirect
          });

          // Auto-copy the message text for convenience
          try {
            await navigator.clipboard.writeText(finalMessage);
            toast.success("Greeting text copied to clipboard!");
          } catch (e) {
            console.warn("Autocopy text failed:", e);
          }
        } else {
          // OPEN WHATSAPP LINK DYNAMICALLY
          const newWindow = window.open(url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            setBlockedPopupUrl(url);
            setBlockedPopupName(directName);
          }
        }

        setDirectPhone("");
        setDirectName("");
        setDirectMessage("");
        setSelectedMediaForDirect(null);
        fetchCRMData();
      }
    } catch (err) {
      toast.error("Direct send failed.");
    }
  };

  // Antiban Score calculations
  const getAntibanSafety = (delay: number) => {
    if (delay >= 15) return { text: "Ultra-Safe Protection", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (delay >= 8) return { text: "Optimal Secure Limit", color: "text-emerald-500 bg-emerald-50/50 border-emerald-100" };
    if (delay >= 4) return { text: "Average Risk Threshold", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { text: "Extreme Risk Level (Ban Danger)", color: "text-rose-600 bg-rose-50 border-rose-200 animate-pulse" };
  };

  // UI Calculation metrics
  const totalMessages = logs.length;
  const sentSuccessful = logs.filter(l => l.status === "delivered" || l.status === "sent").length;
  const sentFailed = logs.filter(l => l.status === "failed").length;
  const completionRate = totalMessages ? Math.round((sentSuccessful / totalMessages) * 100) : 100;
  const liveChannels = accounts.filter(a => a.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Blocked Popup Alert Modal */}
      {blockedPopupUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 space-y-5 text-center animate-scale-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              📱
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-zinc-900 text-lg">Action Required: Open WhatsApp</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Since this application is running inside a secure sandbox preview, your browser blocked the automatic redirect popup.
              </p>
              <p className="text-zinc-600 font-semibold text-sm">
                Click below to safely open WhatsApp and send your message to <span className="text-emerald-600 font-bold">{blockedPopupName || "Client"}</span>:
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <a 
                href={blockedPopupUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setBlockedPopupUrl(null);
                  setBlockedPopupName("");
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                Open WhatsApp Web &rarr;
              </a>
              <button 
                onClick={() => {
                  setBlockedPopupUrl(null);
                  setBlockedPopupName("");
                }}
                className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 font-bold rounded-xl text-xs uppercase"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Media Attachment Guide & Copy Helper Modal */}
      {attachmentGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-zinc-100 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎁</span>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-lg">Send Birthday/Celebration Card</h3>
                  <p className="text-xs text-zinc-500">To: {attachmentGuide.name} ({attachmentGuide.phone})</p>
                </div>
              </div>
              <button 
                onClick={() => setAttachmentGuide(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-700 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-extrabold flex items-center gap-1">
                <AlertCircle size={14} className="text-amber-600" />
                Browser File Upload Limitation
              </p>
              <p>
                Security policies prevent standard website links from automatically uploading media files to external WhatsApp servers. 
                Follow these simple manual copy-paste instructions to send your greeting with the graphics card smoothly!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Visual Template Card & Copy Actions */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Step 1: Save Card Graphic</span>
                
                <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50 max-h-48 flex items-center justify-center relative shadow-sm">
                  {attachmentGuide.media.type.startsWith("image/") ? (
                    <img 
                      src={attachmentGuide.media.data} 
                      alt="Celebration Card" 
                      className="w-full object-contain max-h-44 p-2" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="p-8 text-center text-zinc-400 italic text-xs">
                      {attachmentGuide.media.name} ({attachmentGuide.media.type})
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {attachmentGuide.media.type.startsWith("image/") && (
                    <button
                      onClick={() => copyImageToClipboard(attachmentGuide.media.data, attachmentGuide.media.type)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Copy size={13} />
                      Copy Card to Clipboard
                    </button>
                  )}
                  <button
                    onClick={() => downloadMediaFile(attachmentGuide.media.data, attachmentGuide.media.name)}
                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud size={13} className="rotate-180" />
                    Download Card Image File
                  </button>
                </div>
              </div>

              {/* Right Column: Greeting text to send */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-3">Step 2: Copy Greeting Script</span>
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl text-xs font-serif text-zinc-700 leading-relaxed max-h-36 overflow-y-auto relative shadow-inner">
                    <p className="whitespace-pre-wrap">{attachmentGuide.message}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(attachmentGuide.message);
                        toast.success("Greeting text successfully copied!");
                      } catch (err) {
                        toast.error("Manual copy failed.");
                      }
                    }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-950 text-white font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={13} />
                    Copy Greeting Message
                  </button>
                </div>
              </div>
            </div>

            {/* Final Submission Link Footer */}
            <div className="border-t border-zinc-100 pt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-medium">
                💡 <b className="text-emerald-700">Ctrl+V (Paste)</b> inside WhatsApp to send!
              </span>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setAttachmentGuide(null)}
                  className="px-4 py-2.5 bg-zinc-150 hover:bg-zinc-200 text-zinc-650 hover:text-zinc-800 font-extrabold rounded-xl text-xs uppercase"
                >
                  Dismiss
                </button>
                <a
                  href={`https://wa.me/${attachmentGuide.phone}?text=${encodeURIComponent(attachmentGuide.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAttachmentGuide(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer flex-1 md:flex-none"
                >
                  Go to WhatsApp Chat &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sender Numbers Admin Dashboard Bar */}
      {(() => {
        const connectedAccounts = accounts.filter(acc => acc.status === "connected");
        return (
          <div className="bg-zinc-900 text-white rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md border border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectedAccounts.length > 0 ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connectedAccounts.length > 0 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                </span>
                <h3 className="font-extrabold tracking-tight text-zinc-100 flex items-center gap-1.5 text-sm md:text-base">
                  <span>Admin Messaging Gateway Control</span>
                </h3>
              </div>
              <p className="text-zinc-400 text-xs">
                Monitor and manage active WhatsApp sender lines currently registered for user notifications.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {connectedAccounts.length === 0 ? (
                <div className="bg-zinc-800 text-zinc-300 border border-zinc-700/50 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                  <AlertCircle size={14} className="text-zinc-500" />
                  <span>No active sender lines connected. Register or pair accounts in Account Hub.</span>
                </div>
              ) : (
                connectedAccounts.map((acc) => (
                  <div key={acc.id} className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                    <Smartphone size={14} className="text-emerald-400 animate-pulse" />
                    <span>
                      Sender <strong className="text-emerald-300">"{acc.name}"</strong>: <strong className="font-mono text-emerald-100">{acc.phone || "Initial status link..."}</strong>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* Visual Subtabs Header */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-px">
        {[
          { id: "dashboard", label: "Overview Insights", icon: BarChart3 },
          { id: "accounts", label: "Account Hub", icon: Smartphone },
          { id: "campaigns", label: "Bulk Campaigns", icon: Users },
          { id: "direct", label: "Smart Docs & Invoice", icon: FileText },
          { id: "history", label: "Transmission Logs", icon: Clock },
          { id: "reports", label: "Delivery Reports", icon: PieChart }
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 hover:bg-zinc-50 ${
              activeSubTab === sub.id 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/20" 
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <sub.icon size={16} />
            {sub.label}
          </button>
        ))}
      </div>

      {/* RENDER VIEWPORTS */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Connected Accounts</span>
                <h3 className="text-2xl font-extrabold text-zinc-900 mt-1">{liveChannels} / {accounts.length}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <Smartphone size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Sent Messages</span>
                <h3 className="text-2xl font-extrabold text-zinc-900 mt-1">{totalMessages}</h3>
              </div>
              <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600 font-bold">
                <Send size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Delivery Rate</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{completionRate}%</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Blocked / Failed Txns</span>
                <span className="block text-2xl font-extrabold text-rose-600 mt-1">{sentFailed}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <ShieldAlert size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Account Status */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <h4 className="font-bold text-zinc-900">Line Connections</h4>
                <button onClick={fetchCRMData} className="p-1 hover:bg-zinc-100 rounded text-zinc-500"><RefreshCcw size={14} /></button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-zinc-400 text-sm">No WhatsApp lines configured.</p>
                  <button onClick={() => setActiveSubTab("accounts")} className="mt-3 text-emerald-600 font-bold text-xs hover:underline flex items-center gap-1 justify-center mx-auto">
                    Configure Line <ChevronRight size={12} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div key={acc.id} className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">{acc.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{acc.phone || "No device linked"}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          acc.status === "connected" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : acc.status === "connecting"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-zinc-200 text-zinc-700"
                        }`}>
                          {acc.status === "connected" ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {acc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Metrics Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <h4 className="font-bold text-zinc-900 font-sans">Active & Recent Campaigns</h4>
                <button onClick={() => setActiveSubTab("campaigns")} className="text-emerald-600 font-bold text-xs hover:underline">Launch New</button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 text-sm">No messaging campaign records found.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto pr-1">
                  {campaigns.slice(0, 4).map(camp => {
                    const total = camp.total_contacts || 1;
                    const progress = Math.round(((camp.sent_count + camp.failed_count) / total) * 100);
                    return (
                      <div key={camp.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-zinc-900 text-sm">{camp.name}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">Template message delay: {camp.delay_seconds} seconds</p>
                          </div>
                          <div>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase tracking-wider ${
                              camp.status === "completed" 
                                ? "bg-emerald-100 text-emerald-800"
                                : camp.status === "processing"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-zinc-100 text-zinc-600"
                            }`}>
                              {camp.status}
                            </span>
                          </div>
                        </div>

                        {/* Custom visual progress block */}
                        <div>
                          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                            <span>Succeeded: {camp.sent_count}</span>
                            <span>Failed: {camp.failed_count}</span>
                            <span>Total targets: {camp.total_contacts}</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${camp.status === "completed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTS HUB VIEW */}
      {activeSubTab === "accounts" && (
        <div className="space-y-6 animate-fade-in">
          {/* Add WhatsApp Account Registry Form */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm max-w-2xl">
            <h4 className="font-bold text-zinc-900 mb-1">Add a New WhatsApp Line</h4>
            <p className="text-zinc-500 text-xs mb-4">
              Enter an account label to scan a pairing QR code, or provide a phone number to register it instantly.
            </p>
            <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-zinc-600 text-[11px] font-bold uppercase tracking-wider mb-1.5">Account Label *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Support, Marketing, Personal"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-600 text-[11px] font-bold uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 919876543210"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  value={newAccountPhone}
                  onChange={(e) => setNewAccountPhone(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isCreatingAccount}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {isCreatingAccount ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Line / Number
                </button>
              </div>
            </form>
          </div>

          {/* Cards of accounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div>
                      <h5 className="font-bold text-zinc-900">{acc.name}</h5>
                      <span className="text-zinc-400 text-xs">Registered ID #{acc.id}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      acc.status === "connected" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : acc.status === "connecting"
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    <p className="text-zinc-600 text-sm flex items-center gap-2">
                      <Smartphone size={16} className="text-zinc-400" />
                      {acc.phone || <span className="text-zinc-400 italic">No phone attached</span>}
                    </p>
                    <p className="text-zinc-400 text-xs">
                      Pair status: <span className="font-medium text-zinc-600 capitalize">{acc.status}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  {acc.status === "connected" ? (
                    <button 
                      onClick={() => handleDisconnect(acc.id)}
                      className="w-full py-2 border border-zinc-200 text-zinc-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} />
                      Log Out
                    </button>
                  ) : (
                    <div className="flex flex-col w-full gap-2">
                      <button 
                        onClick={() => startConnectionFlow(acc.id)}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-900 text-white border-0 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode size={14} />
                        Scan QR Pairing
                      </button>

                      <button 
                        onClick={() => {
                          const phoneNum = acc.phone || prompt("Enter WhatsApp Phone Number to link instantly:");
                          if (phoneNum) {
                            handleManualLink(acc.id, phoneNum);
                          }
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        <CheckCircle size={14} />
                        Instant Active Number
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button 
                      onClick={() => setEditingAccount(acc)}
                      className="p-1.5 border border-zinc-150 hover:border-emerald-100 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                      title="Edit Account Line"
                    >
                      <Edit size={14} />
                    </button>

                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1.5 border border-zinc-150 hover:border-rose-100 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="Delete Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* QR Pairing overlay Modal */}
          <AnimatePresence>
            {generatingQRFor !== null && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-center"
                >
                  <button 
                    onClick={() => handleCancelConnection(generatingQRFor)}
                    className="absolute right-4 top-4 p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                  >
                    <X size={20} />
                  </button>

                  <div>
                    <h3 className="font-bold text-zinc-900 text-lg">WhatsApp QR Pair Tool</h3>
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Sandbox Integration Channel</p>
                  </div>
                  
                  {pairingQR ? (
                    <div className="space-y-4">
                      {/* Sandbox Explainer Banner */}
                      <div className="bg-amber-50/75 border border-amber-200/60 p-3.5 rounded-xl text-left text-xs text-amber-800 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <span>💡 Sandbox Environment Notice</span>
                        </div>
                        <p className="leading-relaxed text-[11px] text-amber-800/90">
                          Because this is a safe, sandboxed preview application built to test and design features without risking real WhatsApp cell number blocks/bans, the QR scanning flow is fully simulated.
                        </p>
                        <p className="leading-relaxed text-[11px] font-semibold text-amber-900">
                          To bind your desired WhatsApp phone number, please enter it in the "Instant Link" section below instead!
                        </p>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl flex flex-col items-center justify-center">
                        <img src={pairingQR} className="w-48 h-48 border bg-white rounded shadow-sm object-contain" alt="Scan pairing token" referrerPolicy="no-referrer" />
                        <p className="text-zinc-500 text-xs font-medium mt-2 max-w-xs leading-relaxed">
                          Simulated Baileys pairing QR token generated.
                        </p>
                      </div>

                      <div className="border-t border-zinc-100 pt-4 text-left space-y-2">
                        <label className="block text-zinc-700 text-xs font-bold">Or Pair Manually (Instant Link)</label>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                          Enter your WhatsApp phone number below to instantly mock the scanner and pair this connection channel.
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. 919876543210"
                            className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono"
                            value={manualPairPhone}
                            onChange={(e) => setManualPairPhone(e.target.value)}
                          />
                          <button 
                            type="button"
                            disabled={isManualPairing}
                            onClick={() => handleManualLink(generatingQRFor, manualPairPhone)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {isManualPairing ? "Pairing..." : "Link Number"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <Loader2 size={36} className="animate-spin text-emerald-600" />
                      <p className="text-sm font-semibold text-zinc-600">Spawning Baileys pairing session...</p>
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-zinc-100 pt-4">
                    <button 
                      onClick={() => generatingQRFor && startConnectionFlow(generatingQRFor)}
                      className="flex-1 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs text-zinc-600 font-bold transition-all"
                    >
                      Regenerate
                    </button>
                    <button 
                      onClick={() => handleCancelConnection(generatingQRFor)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* BULK CAMPAIGNS VIEW */}
      {activeSubTab === "campaigns" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Side: Campaign configuration form */}
            <form onSubmit={handleLaunchCampaign} className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-5">
              <h4 className="font-bold text-zinc-900 border-b pb-3">Configure Message Campaign</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Campaign Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. June Vaccination Reminders"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Select WhatsApp Line</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-zinc-700"
                    value={campaignAccount}
                    onChange={(e) => setCampaignAccount(e.target.value)}
                    required
                  >
                    <option value="">-- Choose active channel --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} disabled={acc.status !== "connected"}>
                        {acc.name} {acc.phone ? `(${acc.phone})` : ""} - {acc.status === "connected" ? "Connected" : "Disconnected"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {campaignAccount && (() => {
                const selectedAcc = accounts.find(a => String(a.id) === String(campaignAccount));
                if (selectedAcc && selectedAcc.phone) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 animate-fade-in/70 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span>
                          Active Sender Line: <strong>"{selectedAcc.name}"</strong>
                        </span>
                      </div>
                      <div>
                        Mobile No. from which message is sent: <strong className="font-mono text-emerald-950 font-extrabold text-sm">{selectedAcc.phone}</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Message format details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Campaign Message Template</label>
                  <div className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-bold">Use {"{{name}}"} for personalization</div>
                </div>
                <textarea 
                  rows={4}
                  placeholder="Dear {{name}}, we wish you a very happy anniversary! From All of Us at Shri Krishna."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={campaignTemplate}
                  onChange={(e) => setCampaignTemplate(e.target.value)}
                  required
                />
              </div>

              {/* Anti-ban Rate Limit Configuration */}
              <div className="space-y-3 bg-zinc-50/50 p-4 rounded-xl border border-dashed border-zinc-200">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5">
                    Rate Limiter (Anti-Ban Guard)
                  </h5>
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 border rounded-full ${getAntibanSafety(campaignDelay).color}`}>
                    {getAntibanSafety(campaignDelay).text}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Delay spacing protects your registered WhatsApp line from getting flagged/banned by WhatsApp's spam scanner engine dynamically.
                </p>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min={2} 
                    max={60} 
                    className="flex-1 accent-emerald-600 cursor-pointer"
                    value={campaignDelay}
                    onChange={(e) => setCampaignDelay(parseInt(e.target.value))}
                  />
                  <span className="text-sm font-bold font-mono text-zinc-800 w-16 text-right">
                    {campaignDelay} secs
                  </span>
                </div>
              </div>

              {/* Celebrating Birthday Card Attachment Box */}
              <div className="space-y-3 bg-zinc-50/50 p-4 rounded-xl border border-zinc-205 border-emerald-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <h5 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={14} className="text-amber-500 animate-pulse" />
                    Attach Birthday Card / GIF / Video
                  </h5>
                  <span className="text-[10px] text-zinc-400 italic font-semibold uppercase">Optional Media</span>
                </div>
                
                <p className="text-xs text-zinc-400 leading-normal">
                  Send greetings card, beautiful animated GIFs, or custom celebration videos with your message layout. Direct file upload is saved in your storage cache for automated reuse.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Select Pre-stored Media file */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Choose From Media Library</span>
                    <select
                      className="w-full px-3 py-2 bg-white border border-zinc-200 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-medium text-zinc-700"
                      value={selectedMediaForCampaign ? selectedMediaForCampaign.id : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSelectedMediaForCampaign(null);
                        } else {
                          const item = mediaItems.find(m => String(m.id) === String(val));
                          setSelectedMediaForCampaign(item || null);
                        }
                      }}
                    >
                      <option value="">-- Let Campaign be text-only --</option>
                      {mediaItems.map(item => (
                        <option key={item.id} value={item.id}>
                          🎂 {item.name} ({item.type.split("/")[1]?.toUpperCase() || item.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct instant uploader */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Or upload new files here</span>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,video/*,image/gif"
                        className="hidden"
                        id="campaign-media-attachment-box"
                        disabled={isUploadingMedia}
                        onChange={(e) => handleDirectMediaUpload(e, "campaign")}
                      />
                      <label 
                        htmlFor="campaign-media-attachment-box"
                        className="w-full h-[34px] bg-white text-zinc-700 hover:text-emerald-700 hover:border-emerald-500 border border-zinc-250 border-dashed rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer select-none transition-all shadow-sm"
                      >
                        {isUploadingMedia ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : <UploadCloud size={13} />}
                        <span>{isUploadingMedia ? "Processing file..." : "Browse Birthday media card"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Display Current active file attachment preview */}
                {selectedMediaForCampaign && (
                  <div className="p-3 bg-zinc-90 w-full bg-white border border-dashed border-zinc-350 rounded-xl relative flex gap-3.5 items-center animate-scale-in">
                    <button
                      type="button"
                      onClick={() => setSelectedMediaForCampaign(null)}
                      className="absolute top-2 right-2 p-1 bg-zinc-900/80 hover:bg-rose-600 rounded-full text-white transition-all shadow z-10"
                      title="Clear selection"
                    >
                      <X size={12} />
                    </button>
                    <div className="w-16 h-16 rounded-lg bg-zinc-50 border overflow-hidden flex items-center justify-center shrink-0">
                      {selectedMediaForCampaign.type.startsWith("image/") ? (
                        <img 
                          src={selectedMediaForCampaign.data} 
                          alt="Campaign attachment Card" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : selectedMediaForCampaign.type.startsWith("video/") ? (
                        <video 
                          src={selectedMediaForCampaign.data} 
                          className="w-full h-full object-cover" 
                          muted 
                          playsInline 
                        />
                      ) : (
                        <FileText size={20} className="text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-zinc-800 truncate">{selectedMediaForCampaign.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono tracking-wide mt-0.5 uppercase">
                        {selectedMediaForCampaign.type} • Active File Card Attached
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs font-semibold text-zinc-500">
                  Total selected contacts: <span className="font-extrabold text-emerald-600">{campaignContacts.length}</span>
                </div>
                <button
                  type="submit"
                  disabled={isLaunchingCampaign || campaignContacts.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold uppercase text-xs tracking-widest rounded-xl transition-all flex items-center gap-2"
                >
                  {isLaunchingCampaign ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Launch Campaign
                </button>
              </div>
            </form>

            {/* Right Side: Contact Sourcing System */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Users size={18} className="text-emerald-600" />
                  <span>Build Target List</span>
                </h4>
                {campaignContacts.length > 0 && (
                  <button 
                    type="button"
                    onClick={clearContacts} 
                    className="text-[10px] text-zinc-400 hover:text-rose-500 font-extrabold uppercase tracking-widest bg-zinc-50 hover:bg-rose-50 px-2 py-1 rounded transition-all"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Subtabs for sourcing contacts */}
              <div className="flex border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 p-0.5">
                {[
                  { id: "database", name: "System DB", icon: Database },
                  { id: "excel", name: "Excel Upload", icon: UploadCloud },
                  { id: "paste", name: "Paste CSV", icon: Copy }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setContactsSourceTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold transition-all rounded ${
                      contactsSourceTab === tab.id 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <tab.icon size={13} />
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {campaignContacts.length > 0 ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-150">
                      <span className="font-semibold">Loaded Target Audience:</span>
                      <span className="font-extrabold font-mono">{campaignContacts.length} Contacts ready</span>
                    </div>

                    <div className="border border-zinc-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50/20 shadow-inner">
                      {campaignContacts.map((c, idx) => (
                        <div key={idx} className="p-2.5 text-xs flex justify-between items-center hover:bg-zinc-100/50">
                          <span className="font-bold text-zinc-800">{c.name}</span>
                          <span className="font-mono text-zinc-500 font-semibold">{c.phone}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-center text-zinc-400 italic">
                      Ready to transmit. Click 'Launch Campaign' to begin dispatching.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {contactsSourceTab === "database" && (
                      <div className="space-y-4">
                        <div className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                          <p className="font-semibold text-zinc-800 flex items-center gap-1 mb-1">
                            <Sparkles size={13} className="text-emerald-600 animate-pulse" />
                            Fetch Customer Details
                          </p>
                          Fetch customer, farmer, or patient mobile contacts directly in one click from your local databases.
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleLoadFromDatabase("hospital")}
                            className="w-full py-2.5 bg-white border border-zinc-200 hover:border-emerald-500 text-zinc-700 hover:text-emerald-700 rounded-xl text-xs font-bold tracking-wide flex items-center justify-between px-4 transition-all shadow-sm hover:shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Hospital Patients
                            </span>
                            <span className="font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {hospitalEntries.length} Records
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadFromDatabase("dairy")}
                            className="w-full py-2.5 bg-white border border-zinc-200 hover:border-blue-500 text-zinc-700 hover:text-blue-700 rounded-xl text-xs font-bold tracking-wide flex items-center justify-between px-4 transition-all shadow-sm hover:shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Dairy Farmers
                            </span>
                            <span className="font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {dairyEntries.length} Records
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadFromDatabase("all")}
                            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-950 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-between px-4 transition-all shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-zinc-400" />
                              Combined (All Entries)
                            </span>
                            <span className="font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {hospitalEntries.length + dairyEntries.length} Total
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {contactsSourceTab === "excel" && (
                      <div className="space-y-4">
                        <div className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                          Upload any Excel or CSV customer worksheet. The CRM automatically parses <strong>phone</strong> and <strong>name</strong> column pairs for campaign delivery.
                        </div>

                        <div className="border-2 border-dashed border-zinc-200 hover:border-emerald-500 bg-zinc-50 hover:bg-zinc-100/55 transition-all rounded-2xl p-6 text-center cursor-pointer relative group">
                          <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="space-y-2 flex flex-col items-center">
                            <div className="p-3 bg-white rounded-full text-zinc-400 group-hover:text-emerald-600 shadow-sm transition-all">
                              <UploadCloud size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-700">Upload Bulk Customer Spreadsheet</p>
                              <p className="text-[10px] text-zinc-400 mt-1">Supports XLSX, XLS, CSV files</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {contactsSourceTab === "paste" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">CSV Raw Paste</label>
                          <textarea 
                            rows={5}
                            placeholder="phone,name&#10;919988776655,Aman Kumar&#10;917766554433,Rekha Singh"
                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                          />
                          <p className="text-[10px] text-zinc-400">Put one mobile number per line. Seperate name with a comma if desired.</p>
                        </div>

                        <button 
                          type="button"
                          onClick={handleImportContacts}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-950 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <FileSpreadsheet size={14} />
                          Parse Raw Text
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Campaign Records Management Section */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4 animate-fade-in">
            <h4 className="font-bold text-zinc-950 flex items-center justify-between border-b pb-3 text-sm tracking-wide">
              <span>🗂️ All Campaign Records</span>
              <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">{campaigns.length} campaigns</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Campaign Name</th>
                    <th className="px-5 py-3">Message Template</th>
                    <th className="px-5 py-3">Delay</th>
                    <th className="px-5 py-3">Delivery Progress</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {campaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-zinc-50/40">
                      <td className="px-5 py-4 font-bold text-zinc-800">{camp.name}</td>
                      <td className="px-5 py-4 max-w-xs truncate text-zinc-500" title={camp.message}>{camp.message}</td>
                      <td className="px-5 py-4 font-mono text-zinc-640 font-semibold">{camp.delay_seconds}s spacing</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                            camp.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                            camp.status === "processing" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-zinc-150 text-zinc-650"
                          }`}>{camp.status}</span>
                          <span className="text-[11px] text-zinc-400 font-medium">({camp.sent_count} / {camp.total_contacts})</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingCampaign(camp)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-zinc-400 italic">No campaign records stored in the system database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SMART DOCUMENTS AND INVOICE TOOLKIT */}
      {activeSubTab === "direct" && (
        <>
          <form onSubmit={handleSendDirect} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <div className="lg:col-span-2 space-y-5">
            <h4 className="font-bold text-zinc-900 border-b pb-3">Smart Invoice & PDF Dispatch</h4>

            {/* Quick Auto-Fill Celebrant Section */}
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500 animate-pulse" />
                  Quick Auto-Fill Birthdays & Anniversaries
                </span>
                <span className="text-[10px] text-zinc-400 bg-white px-2 py-0.5 rounded border">Auto-fetch Name & Phone</span>
              </div>

              {/* Today's Celebrants Row */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase">Today's Celebrants:</p>
                {(() => {
                  const todayBdays = [...(hospitalEntries || []), ...(dairyEntries || [])].filter(e => isBirthdayToday(e.dob));
                  const todayAnnivs = [...(hospitalEntries || []), ...(dairyEntries || [])].filter(e => isAnniversaryToday(e.anniversary));
                  const totalCelebrants = todayBdays.length + todayAnnivs.length;

                  if (totalCelebrants === 0) {
                    return (
                      <p className="text-xs text-zinc-500 italic pb-1">
                        No clients have birthdays or anniversaries today. Use the database selector below to pre-set any record.
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      {todayBdays.map((p, idx) => (
                        <button
                          key={`bday-${idx}`}
                          type="button"
                          onClick={() => handleSelectContact(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <Cake size={12} className="text-emerald-600 animate-bounce" style={{ animationDuration: '2s' }} />
                          <span>{p.name} (🎂 b'day)</span>
                        </button>
                      ))}
                      {todayAnnivs.map((p, idx) => (
                        <button
                          key={`anniv-${idx}`}
                          type="button"
                          onClick={() => handleSelectContact(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <Heart size={12} className="text-rose-500 animate-pulse" />
                          <span>{p.name} (💍 anniv)</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Database Search Selector */}
              <div className="pt-2 border-t border-zinc-200/50 flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="w-full md:flex-1">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">🔍 Select Celebrant from Database:</p>
                  <select
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const all = [...(hospitalEntries || []), ...(dairyEntries || [])];
                      const matched = all.find(item => String(item.id) === selectedId);
                      if (matched) {
                        handleSelectContact(matched);
                        // Reset select index
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">-- Choose Patient / Farmer with recorded DOB or Anniv --</option>
                    {(() => {
                      const withDates = [...(hospitalEntries || []).map(e => ({ ...e, _sourceType: "Patient" })), ...(dairyEntries || []).map(e => ({ ...e, _sourceType: "Farmer/Customer" }))]
                        .filter(e => (e.dob && e.dob.length >= 5) || (e.anniversary && e.anniversary.length >= 5))
                        .sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
                      
                      return withDates.map((item, idx) => {
                        const bdayStr = item.dob ? `Bday: ${item.dob}` : "";
                        const annStr = item.anniversary ? `Anniv: ${item.anniversary}` : "";
                        const datesInfo = [bdayStr, annStr].filter(Boolean).join(" | ");
                        return (
                          <option key={idx} value={item.id}>
                            {item.name} ({item.phone}) - {datesInfo} [{item._sourceType}]
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Client/Recipient Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={directName}
                  onChange={(e) => {
                    handleCRMDirectNameChange(e.target.value);
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  required
                />
                
                {showNameSuggestions && directName.trim().length > 0 && (
                  <div className="absolute left-0 right-0 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl mt-1 max-h-52 overflow-y-auto divide-y divide-zinc-100">
                    {(() => {
                      const query = directName.toLowerCase();
                      const filtered = [
                        ...(hospitalEntries || []).map(e => ({ ...e, _sourceType: "Patient" })),
                        ...(dairyEntries || []).map(e => ({ ...e, _sourceType: "Farmer/Customer" }))
                      ].filter(e => String(e.name || "").toLowerCase().includes(query)).slice(0, 5);
                      
                      if (filtered.length === 0) return <div className="p-3 text-xs text-zinc-500 text-center">No matching database records</div>;
                      
                      return filtered.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between text-xs transition-colors"
                          onClick={() => handleSelectContact(item)}
                        >
                          <div>
                            <span className="font-bold text-zinc-800">{item.name}</span>
                            <span className="text-zinc-400 font-mono text-[10px] ml-2">({item.phone})</span>
                          </div>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-[6px] font-semibold text-[9px] uppercase tracking-wider">{item._sourceType}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">WhatsApp Phone Number</label>
                <input 
                  type="text" 
                  placeholder="919988776655"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  value={directPhone}
                  onChange={(e) => {
                    handleCRMDirectPhoneChange(e.target.value);
                    setShowPhoneSuggestions(true);
                  }}
                  onFocus={() => setShowPhoneSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                  required
                />

                {showPhoneSuggestions && directPhone.trim().length > 0 && (
                  <div className="absolute left-0 right-0 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl mt-1 max-h-52 overflow-y-auto divide-y divide-zinc-100">
                    {(() => {
                      const query = directPhone.replace(/\D/g, "");
                      const filtered = [
                        ...(hospitalEntries || []).map(e => ({ ...e, _sourceType: "Patient" })),
                        ...(dairyEntries || []).map(e => ({ ...e, _sourceType: "Farmer/Customer" }))
                      ].filter(e => String(e.phone || "").replace(/\D/g, "").includes(query)).slice(0, 5);
                      
                      if (filtered.length === 0) return <div className="p-3 text-xs text-zinc-500 text-center">No matching database records</div>;
                      
                      return filtered.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between text-xs transition-colors"
                          onClick={() => handleSelectContact(item)}
                        >
                          <div>
                            <span className="font-bold text-zinc-800">{item.name}</span>
                            <span className="text-zinc-400 font-mono text-[10px] ml-2">({item.phone})</span>
                          </div>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-[6px] font-semibold text-[9px] uppercase tracking-wider">{item._sourceType}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {directMessageStatus && (
              <div className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 animate-fade-in flex items-center gap-2 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse block" />
                {directMessageStatus}
              </div>
            )}

            {/* Selector Document type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Payload Document Type</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { id: "text", label: "💬 Plain Text" },
                  { id: "invoice", label: "🧾 Invoice PDF" },
                  { id: "receipt", label: "✅ Receipt PDF" },
                  { id: "birthday_card", label: "🎁 Birthday Card" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocType(item.id as any);
                      if (item.id === "birthday_card" && !directMessage) {
                        setDirectMessage("Happy Birthday! Wishing you a super prosperous year filled with premium milestones and fantastic health! 🎂🎈");
                      }
                    }}
                    className={`p-2.5 text-[11px] font-bold tracking-tight uppercase border rounded-xl transition-all flex flex-col justify-center items-center text-center leading-tight gap-1 ${
                      selectedDocType === item.id 
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message payload custom text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Optional Message Caption</label>
              <textarea 
                rows={3}
                placeholder="Thanks for taking care of your appointments. Looking forward to see you soon."
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="lg:w-fit px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Send size={14} />
              Transmit Document
            </button>
          </div>

          {/* Right Preview details for Invoice */}
          <div className="bg-zinc-50/60 p-6 rounded-2xl border border-zinc-250 border-dashed space-y-4">
            <h5 className="font-bold text-zinc-700 text-sm border-b pb-2">Document Details Preview</h5>

            {selectedDocType === "text" ? (
              <div className="py-24 text-center text-zinc-400 text-xs italic space-y-2">
                <AlertCircle className="mx-auto text-zinc-300" size={32} />
                <p>Simple text output only. Choose Invoice Form, Payment Receipt, or Birthday Card in the left column to compile payloads.</p>
              </div>
            ) : selectedDocType === "birthday_card" ? (
              <div className="space-y-4 text-xs font-sans">
                {/* Media Select / Upload block */}
                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">1. Choose Celebration Asset</span>
                    <Sparkles size={11} className="text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
                  </div>
                  
                  <div className="space-y-2">
                    <select
                      className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs font-medium text-zinc-700"
                      value={selectedMediaForDirect ? selectedMediaForDirect.id : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSelectedMediaForDirect(null);
                        } else {
                          const item = mediaItems.find(m => String(m.id) === String(val));
                          setSelectedMediaForDirect(item || null);
                        }
                      }}
                    >
                      <option value="">-- Choose From Template Store --</option>
                      {mediaItems.map(item => (
                        <option key={item.id} value={item.id}>
                          🎁 {item.name} ({item.type.split("/")[1]?.toUpperCase() || item.type})
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,video/*,image/gif"
                        className="hidden"
                        id="direct-birthday-attachment-box"
                        disabled={isUploadingMedia}
                        onChange={(e) => handleDirectMediaUpload(e, "direct")}
                      />
                      <label 
                        htmlFor="direct-birthday-attachment-box"
                        className="w-full h-[32px] bg-zinc-805 bg-zinc-800 hover:bg-zinc-950 text-white rounded-lg flex items-center justify-center gap-1 font-bold text-[11px] cursor-pointer select-none transition-all shadow-sm"
                      >
                        {isUploadingMedia ? <Loader2 size={12} className="animate-spin text-zinc-300" /> : <UploadCloud size={12} />}
                        <span>{isUploadingMedia ? "Uploading..." : "Upload New Birthday Graphic/Video/GIF"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Smartphone Chat mockup bubble with Card preview */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">2. WhatsApp Live Mockup</span>
                  <div className="border border-zinc-200 rounded-2xl p-3 bg-[#efeae2] shadow-inner space-y-2 font-sans relative overflow-hidden min-h-[160px] flex flex-col justify-end">
                    {/* Header bar of whatsapp chat bubble */}
                    <div className="flex items-center gap-1.5 border-b border-zinc-200/50 pb-1.5 mb-1 bg-white/40 -mx-3 -mt-3 px-3 py-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-700 tracking-tight font-sans">
                        To: {directName || "Recipient Name"}
                      </span>
                    </div>

                    {/* Chat Bubble card containing Image/GIF/Video preview */}
                    <div className="bg-white p-1 rounded-xl shadow-sm max-w-[92%] ml-1 self-start border border-zinc-150 relative">
                      {/* Media render block */}
                      {selectedMediaForDirect ? (
                        <div className="rounded-lg overflow-hidden border border-zinc-100 max-h-48 flex items-center justify-center bg-zinc-50 relative group">
                          {selectedMediaForDirect.type.startsWith("image/") ? (
                            <img 
                              src={selectedMediaForDirect.data} 
                              alt="Birthday Card" 
                              className="w-full object-contain max-h-48" 
                              referrerPolicy="no-referrer"
                            />
                          ) : selectedMediaForDirect.type.startsWith("video/") ? (
                            <video 
                              src={selectedMediaForDirect.data} 
                              className="w-full max-h-48 object-contain" 
                              controls 
                              playsInline 
                              autoPlay 
                              loop 
                              muted
                            />
                          ) : (
                            <div className="p-8 text-center text-zinc-400 italic">Unsupported File Format</div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-zinc-900/40 text-[9px] text-white px-1.5 py-0.5 rounded font-mono font-semibold">
                            {selectedMediaForDirect.type.toUpperCase()}
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg flex flex-col items-center gap-1">
                          <CheckCircle className="text-zinc-300 animate-pulse" size={24} />
                          <p className="text-[10px] font-semibold text-zinc-700">Ready to upload/attach Card.</p>
                          <p className="text-[9px] text-zinc-400">Attachments will mock preview here.</p>
                        </div>
                      )}

                      {/* Msg Caption */}
                      <div className="p-2 text-xs text-zinc-700 leading-relaxed font-sans mt-0.5">
                        <p className="font-semibold text-emerald-800 text-[10px] mb-0.5 flex items-center gap-0.5">
                          <Sparkles size={10} className="text-amber-500" />
                          🎉 Celebration Delivery:
                        </p>
                        {directMessage || "Happy Birthday / Anniversary! We wish you boundless joy and premium health. 🎂🎈"}
                      </div>

                      {/* WhatsApp timestamp */}
                      <div className="text-[9px] text-zinc-400 text-right pr-1 pb-0.5 font-sans flex items-center justify-end gap-0.5 border-t border-zinc-100 pt-1 mt-1">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <Check size={10} className="text-sky-500 font-extrabold" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Item/Service Description</span>
                  <input 
                    type="text"
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 finished text-sm"
                    value={docItems}
                    onChange={(e) => setDocItems(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Amount (Rs)</span>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 finished text-sm font-mono"
                      value={docAmount}
                      onChange={(e) => setDocAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Service Tax (Gst)</span>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 finished text-sm font-mono"
                      value={docTax}
                      onChange={(e) => setDocTax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Billing Reference Code</span>
                  <input 
                    type="text"
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 finished text-sm font-mono"
                    value={docReference}
                    onChange={(e) => setDocReference(e.target.value)}
                  />
                </div>

                {/* Aesthetic Visual representation of PDF bill receipt */}
                <div className="border border-zinc-300 rounded p-4 bg-white shadow-sm space-y-2.5 font-sans mt-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-1 bg-emerald-500" />
                  
                  <div className="flex justify-between items-center text-[9px] border-b pb-1.5">
                    <span className="font-extrabold text-zinc-800">SHRI KRISHNA CORP.</span>
                    <span className="font-mono text-zinc-400">UNPAID INVOICE</span>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between font-medium">
                      <span className="text-zinc-500">Bill To:</span>
                      <span className="text-zinc-900 font-extrabold">{directName || "(Aman)"}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-zinc-500">Item Name:</span>
                      <span className="text-zinc-900">{docItems}</span>
                    </div>
                    <div className="flex justify-between font-medium font-mono">
                      <span className="text-zinc-500">Subtotal Cost:</span>
                      <span className="text-zinc-900">Rs {docAmount}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed pt-1.5 font-bold mt-2 text-[11px]">
                      <span className="text-zinc-600">Total Charged:</span>
                      <span className="text-emerald-700 font-extrabold font-mono">Rs {(parseFloat(docAmount) + parseFloat(docTax) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Smart Documents and Invoices Records Table */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4 animate-fade-in mt-6">
          <h4 className="font-bold text-zinc-950 flex items-center justify-between border-b pb-3 text-sm tracking-wide">
            <span>🧾 Saved Smart Documents & Digital Invoices</span>
            <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">{docsInvoices.length} entries</span>
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Doc Reference</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Doc Type</th>
                  <th className="px-5 py-3">Billed Items</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Created / Sent</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {docsInvoices.map(doc => (
                  <tr key={doc.id} className="hover:bg-zinc-50/40">
                    <td className="px-5 py-4 font-mono font-bold text-zinc-900">{doc.reference || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-zinc-850">{doc.recipient_name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono font-semibold">{doc.recipient_phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        doc.doc_type === "invoice" ? "bg-amber-100 text-amber-800" :
                        doc.doc_type === "receipt" ? "bg-emerald-100 text-emerald-800" :
                        doc.doc_type === "birthday_card" ? "bg-pink-100 text-pink-800" : "bg-zinc-100 text-zinc-600"
                      }`}>{doc.doc_type || "text"}</span>
                    </td>
                    <td className="px-5 py-4 text-zinc-600 max-w-xs truncate" title={doc.items}>{doc.items || <span className="text-zinc-400 italic">None</span>}</td>
                    <td className="px-5 py-4 font-mono font-bold text-zinc-800">{doc.amount ? `Rs. ${doc.amount}` : "-"}</td>
                    <td className="px-5 py-4 text-zinc-400 font-medium">{doc.created_at ? new Date(doc.created_at).toLocaleString() : "-"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                        doc.status === "paid" || doc.status === "completed" || doc.status === "delivered" || doc.status === "sent" ? "bg-emerald-100 text-emerald-800 font-extrabold" :
                        doc.status === "pending" ? "bg-amber-100 text-amber-850 animate-pulse font-extrabold" : "bg-rose-100 text-rose-800"
                      }`}>{doc.status === "sent" ? "delivered" : (doc.status || "delivered")}</span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingDoc(doc)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {docsInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-zinc-400 italic">No smart documents or invoices created yet. Create one above to persist records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* DETAILED MESSAGE LOGS */}
      {activeSubTab === "history" && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
            <h4 className="font-bold text-zinc-900">Delivery Status Track</h4>
            <div className="text-xs text-zinc-500 font-sans">Showing latest 200 dispatches</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-zinc-400 border-b border-zinc-100 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Message Sample</th>
                  <th className="px-6 py-4">Time Sent</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Transmission Error Details</th>
                  <th className="px-6 py-4 text-right">Direct Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-bold text-zinc-800">{log.recipient_name}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-zinc-600">{log.recipient_phone}</td>
                    <td className="px-6 py-4 max-w-sm line-clamp-1 truncate text-zinc-500 mt-3">{log.message}</td>
                    <td className="px-6 py-4 text-zinc-400 font-medium">{new Date(log.sent_at || log.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        log.status === "delivered" || log.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "failed"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-rose-500 font-medium italic">{log.error_message || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          let cleanPhone = String(log.recipient_phone).replace(/\D/g, "");
                          if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
                            cleanPhone = cleanPhone.substring(1);
                          }
                          if (cleanPhone.length === 10) {
                            cleanPhone = "91" + cleanPhone;
                          }
                          const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(log.message)}`;
                          const newWindow = window.open(url, '_blank');
                          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            setBlockedPopupUrl(url);
                            setBlockedPopupName(log.recipient_name);
                          }
                        }}
                        className="ml-auto px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Send size={10} />
                        Send Web
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">No transmitted message records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WHATSAPP DELIVERY REPORTS & STATUS METRICS HUB */}
      {activeSubTab === "reports" && (
        <div className="space-y-6 animate-fade-in text-zinc-800">
          {/* Top Info Context */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-500/20">Enterprise Telemetry</span>
              <h3 className="text-xl md:text-2xl font-black font-sans tracking-tight">Transmission Delivery & Status Audit Desk</h3>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl font-sans">
                Real-time tracking of message logs across clients. Easily audit seen receipts, unread delivered items, blocks, and simulation queue metrics.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
              <PieChart size={180} />
            </div>
          </div>

          {/* KPI Widget Selectables Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { id: "all", label: "All Dispatches", count: logs.length, colorClass: "border-zinc-200 hover:border-zinc-400 bg-white text-zinc-900", activeClass: "ring-2 ring-zinc-900 border-zinc-900 bg-zinc-50" },
              { id: "sent", label: "Sent Message", count: logs.filter(l => l.status === "sent").length, colorClass: "border-blue-100 hover:border-blue-300 bg-blue-50/20 text-blue-950", activeClass: "ring-2 ring-blue-500 border-blue-400 bg-blue-50/60" },
              { id: "delivered", label: "Delivered", count: logs.filter(l => l.status === "delivered" || l.status === "seen" || l.status === "unseen").length, colorClass: "border-teal-100 hover:border-teal-300 bg-teal-50/20 text-teal-950", activeClass: "ring-2 ring-teal-500 border-teal-400 bg-teal-50/60" },
              { id: "seen", label: "Seen by Client", count: logs.filter(l => l.status === "seen").length, colorClass: "border-emerald-100 hover:border-emerald-300 bg-emerald-50/20 text-emerald-950", activeClass: "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/60" },
              { id: "unseen", label: "Not See (Unseen)", count: logs.filter(l => l.status === "unseen").length, colorClass: "border-amber-100 hover:border-amber-300 bg-amber-50/20 text-amber-950", activeClass: "ring-2 ring-amber-500 border-amber-400 bg-amber-50/60" },
              { id: "queued", label: "Queued (Buffer)", count: logs.filter(l => l.status === "queued" || l.status === "pending").length, colorClass: "border-indigo-100 hover:border-indigo-300 bg-indigo-50/20 text-indigo-950", activeClass: "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/60" },
              { id: "deleted", label: "Deleted", count: logs.filter(l => l.status === "deleted").length, colorClass: "border-pink-100 hover:border-pink-300 bg-pink-50/20 text-pink-950", activeClass: "ring-2 ring-pink-500 border-pink-400 bg-pink-50/60" },
              { id: "blocked", label: "Blocked Number", count: logs.filter(l => l.status === "blocked").length, colorClass: "border-rose-100 hover:border-rose-300 bg-rose-50/20 text-rose-950", activeClass: "ring-2 ring-rose-500 border-rose-400 bg-rose-50/60" }
            ].map((kpi) => {
              const isActive = reportsFilter === kpi.id;
              const percent = logs.length > 0 ? Math.round((kpi.count / logs.length) * 100) : 0;
              return (
                <button
                  key={kpi.id}
                  onClick={() => setReportsFilter(kpi.id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 h-28 relative ${
                    isActive ? kpi.activeClass : kpi.colorClass
                  }`}
                >
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-wide opacity-75 line-clamp-1">{kpi.label}</p>
                    <h4 className="text-xl font-extrabold mt-1 font-mono tracking-tight">{kpi.count}</h4>
                  </div>
                  <div className="flex items-center justify-between mt-auto w-full">
                    <span className="text-[9px] font-mono opacity-60">Ratio: {percent}%</span>
                    {isActive && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* SENDER LINE DISPATCH REPORTS SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h4 className="font-extrabold text-zinc-900 flex items-center gap-2">
                  <Smartphone className="text-emerald-500 shrink-0" size={18} />
                  Sender WhatsApp Lines - Dispatch Telemetry Report
                </h4>
                <p className="text-zinc-500 text-xs mt-0.5">Auditing dispatches, success ratios, and carrier filters grouped by sending channel credentials.</p>
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                Active Channels: {accounts.filter(a => a.status === "connected").length} / {accounts.length}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSenderAccountStats().map(stat => {
                return (
                  <div key={stat.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 flex flex-col justify-between space-y-3 shadow-inner">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${stat.status === "connected" ? "bg-emerald-500" : "bg-zinc-300"}`} />
                          <span className="font-extrabold text-zinc-950 text-sm">{stat.name}</span>
                        </div>
                        <span className="font-mono text-xs font-black text-zinc-500 block mt-1">
                          {stat.phone !== "No pairing phone" && stat.phone !== "No Number paired" ? `+${stat.phone}` : "Line Offline (No paired number)"}
                        </span>
                      </div>
                      <span className="text-[10px] bg-zinc-200 text-zinc-700 font-bold px-2 py-1 rounded-md font-mono shrink-0">
                        {stat.total} Sent Logs
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-100/80 bg-white p-2 rounded-lg">
                      <div>
                        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Seen (Read)</div>
                        <div className="text-xs font-black text-emerald-600">{stat.seenRate}%</div>
                        <span className="text-[9px] text-zinc-400 font-mono font-semibold">({stat.seen} read)</span>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Success Rate</div>
                        <div className="text-xs font-black text-blue-600">{stat.successRate}%</div>
                        <span className="text-[9px] text-zinc-400 font-mono font-semibold">({stat.delivered} recvd)</span>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Blocked Line</div>
                        <div className="text-xs font-black text-rose-600">{stat.blockRate}%</div>
                        <span className="text-[9px] text-zinc-400 font-mono font-semibold">({stat.blocked} blocked)</span>
                      </div>
                    </div>

                    {/* Progress tracking line */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400">
                        <span>Transmission Health</span>
                        <span>{stat.successRate}% Connected</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.successRate > 75 
                              ? "bg-emerald-500" 
                              : stat.successRate > 40 
                              ? "bg-amber-500" 
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${stat.successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && (
                <div className="col-span-full py-6 text-center text-zinc-400 italic text-xs">
                  Create and sync sender credentials first to audit custom line statistics.
                </div>
              )}
            </div>
          </div>

          {/* Visual Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart: Delivery Outcome Summary */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                  <PieChart size={16} className="text-emerald-600" />
                  Delivery Outcome Funnel
                </h4>
                <p className="text-zinc-500 text-xs mt-1">Interactive status distribution ratio</p>
              </div>

              <div className="h-44 my-4 relative">
                {logs.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs">No analytics data to generate</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: "Seen by Client", value: logs.filter(l => l.status === "seen").length, color: "#10B981" },
                          { name: "Not See (Unread)", value: logs.filter(l => l.status === "unseen").length, color: "#F59E0B" },
                          { name: "Sent Message", value: logs.filter(l => l.status === "sent").length, color: "#3B82F6" },
                          { name: "Delivered", value: logs.filter(l => l.status === "delivered").length, color: "#14B8A6" },
                          { name: "Queued", value: logs.filter(l => l.status === "queued" || l.status === "pending").length, color: "#6366F1" },
                          { name: "Deleted", value: logs.filter(l => l.status === "deleted").length, color: "#EC4899" },
                          { name: "Blocked Number", value: logs.filter(l => l.status === "blocked").length, color: "#EF4444" }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: "#10B981" }, { color: "#F59E0B" }, { color: "#3B82F6" }, 
                          { color: "#14B8A6" }, { color: "#6366F1" }, { color: "#EC4899" }, { color: "#EF4444" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} logs`, 'Volume']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Status Legends */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-sans font-bold text-zinc-600">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" /> Seen: {logs.filter(l => l.status === "seen").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500" /> Not See: {logs.filter(l => l.status === "unseen").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500" /> Sent: {logs.filter(l => l.status === "sent").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-teal-500" /> Delivered: {logs.filter(l => l.status === "delivered").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-indigo-500" /> Queued: {logs.filter(l => l.status === "queued" || l.status === "pending").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-pink-500" /> Deleted: {logs.filter(l => l.status === "deleted").length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500" /> Blocked: {logs.filter(l => l.status === "blocked").length}</div>
              </div>
            </div>

            {/* Bar Chart: Campaign Outcome Comparisons */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between lg:col-span-2">
              <div>
                <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  Campaign Metrics Breakdown
                </h4>
                <p className="text-zinc-500 text-xs mt-1">Status outcomes comparing different campaigns</p>
              </div>

              <div className="h-52 my-3">
                {campaigns.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs">No campaign dispatches cataloged</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBar
                      data={(() => {
                        const directLogs = logs.filter(l => !l.campaign_id);
                        const list = campaigns.map(camp => {
                          const campLogs = logs.filter(l => l.campaign_id === camp.id);
                          return {
                            name: camp.name.length > 15 ? camp.name.substring(0, 12) + "..." : camp.name,
                            Seen: campLogs.filter(l => l.status === "seen").length,
                            Unseen: campLogs.filter(l => l.status === "unseen").length,
                            Sent: campLogs.filter(l => l.status === "sent" || l.status === "delivered").length,
                            Blocked: campLogs.filter(l => l.status === "blocked").length,
                          };
                        });
                        if (directLogs.length > 0) {
                          list.push({
                            name: "Direct Alerts",
                            Seen: directLogs.filter(l => l.status === "seen").length,
                            Unseen: directLogs.filter(l => l.status === "unseen").length,
                            Sent: directLogs.filter(l => l.status === "sent" || l.status === "delivered").length,
                            Blocked: directLogs.filter(l => l.status === "blocked").length,
                          });
                        }
                        return list;
                      })()}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} fontStyle="bold" stroke="#71717A" />
                      <YAxis fontSize={10} tickLine={false} stroke="#71717A" />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                      <Bar dataKey="Seen" name="Seen by Client" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Unseen" name="Not See / Unread" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Sent" name="Delivered / Sent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Blocked" name="Blocked Number" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </RechartsBar>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 flex items-center gap-2">
                <Info size={14} className="text-zinc-500 shrink-0" />
                <span>The system maps incoming transmission payloads automatically. Toggle states by clicking the KPI cards to audit raw logs below instantly.</span>
              </div>
            </div>
          </div>

          {/* Webhook Status Simulator Sandbox */}
          <div className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-emerald-500/5 p-6 rounded-2xl border border-emerald-500/20 shadow-inner space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-teal-900 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Webhook Receipt Sandbox Emulator
                </h4>
                <p className="text-teal-700 text-xs mt-0.5">Toggle and simulate user behaviors to check if telemetry responds accurately.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold font-mono">PORT 3000 WEBSOCKETS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 space-y-1">
                <label className="text-[11px] font-bold text-teal-800 uppercase">Select Target Message Dispatch</label>
                <select
                  value={webhookMessageId}
                  onChange={(e) => setWebhookMessageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-teal-200 focus:outline-none bg-white focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">-- Choose message dispatch log --</option>
                  {logs.map(log => (
                    <option key={log.id} value={log.id}>
                      [{log.status.toUpperCase()}] {log.recipient_name} ({log.recipient_phone}) - {log.message.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-teal-800 uppercase">Simulate Customer Behavior</label>
                <select
                  value={webhookSimulationStatus}
                  onChange={(e) => setWebhookSimulationStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-teal-200 focus:outline-none bg-white focus:ring-1 focus:ring-teal-400 font-extrabold text-zinc-700"
                >
                  <option value="seen">Seen by client (Open & read)</option>
                  <option value="unseen">Not see (Received but ignored)</option>
                  <option value="deleted">Deleted (Customer deleted message)</option>
                  <option value="blocked">Blocked Number (Customer reported/blocked sender)</option>
                  <option value="delivered">Delivered (Handset double ticks)</option>
                  <option value="queued">Queued (Stored in carrier queue)</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={handleTriggerWebhook}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transform hover:-translate-y-px transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play size={12} />
                  Trigger Webhook Log
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Search Audit Table */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden font-sans">
            <div className="p-5 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-zinc-900 text-sm flex items-center gap-1">
                  Database Filter Audit Log 
                  <span className="text-xs text-zinc-400 font-normal font-mono">({reportsFilter.toUpperCase()})</span>
                </h4>
                <p className="text-zinc-500 text-xs mt-0.5">Filtering matches corresponding to Selected KPI block</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* FILTER BY SENDER PHONE NUMBER CHANNEL */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Sender Line:</span>
                  <select
                    value={reportsSenderFilter}
                    onChange={(e) => setReportsSenderFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 bg-white font-bold text-zinc-700"
                  >
                    <option value="all">All Senders (Show All)</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.phone ? `(+${acc.phone})` : "(No Phone)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Term */}
                <input
                  type="text"
                  placeholder="Search recipient, number, content..."
                  value={reportsSearchTerm}
                  onChange={(e) => setReportsSearchTerm(e.target.value)}
                  className="px-3.5 py-1.5 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 w-60"
                />

                <button
                  onClick={downloadReportsCSV}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-zinc-950/10"
                >
                  <FileSpreadsheet size={13} />
                  Export CSV Audit
                </button>

                <button
                  onClick={downloadReportsPDF}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/10"
                >
                  <FileText size={13} />
                  Export PDF Audit
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-400 border-b border-zinc-100 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="px-6 py-4">Recipient Client</th>
                    <th className="px-6 py-4">Phone Code</th>
                    <th className="px-6 py-4">Sender WhatsApp Line</th>
                    <th className="px-6 py-4">Message Sample Details</th>
                    <th className="px-6 py-4">Last Status Modification</th>
                    <th className="px-6 py-4">Status Log</th>
                    <th className="px-6 py-4">Error / Retract Logs</th>
                    <th className="px-6 py-4 text-right font-sans">Quick Toggle Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {(() => {
                    let filtered = [...logs];

                    // Segment by report cards
                    if (reportsFilter === "sent") {
                      filtered = filtered.filter(l => l.status === "sent");
                    } else if (reportsFilter === "delivered") {
                      filtered = filtered.filter(l => l.status === "delivered" || l.status === "seen" || l.status === "unseen");
                    } else if (reportsFilter === "seen") {
                      filtered = filtered.filter(l => l.status === "seen");
                    } else if (reportsFilter === "unseen") {
                      filtered = filtered.filter(l => l.status === "unseen");
                    } else if (reportsFilter === "queued") {
                      filtered = filtered.filter(l => l.status === "queued" || l.status === "pending");
                    } else if (reportsFilter === "deleted") {
                      filtered = filtered.filter(l => l.status === "deleted");
                    } else if (reportsFilter === "blocked") {
                      filtered = filtered.filter(l => l.status === "blocked");
                    }

                    // Segment by sender channel
                    if (reportsSenderFilter !== "all") {
                      filtered = filtered.filter(l => {
                        const sInfo = getSenderInfo(l);
                        return String(sInfo.id) === String(reportsSenderFilter);
                      });
                    }

                    // Segment by search term
                    if (reportsSearchTerm.trim()) {
                      const search = reportsSearchTerm.toLowerCase();
                      filtered = filtered.filter(l => 
                        String(l.recipient_name || "").toLowerCase().includes(search) ||
                        String(l.recipient_phone || "").toLowerCase().includes(search) ||
                        String(l.message || "").toLowerCase().includes(search)
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic font-sans text-xs">No records correspond to the selected filters. Change card selection or search tags filter.</td>
                        </tr>
                      );
                    }

                    return filtered.map((log) => {
                      const sInfo = getSenderInfo(log);
                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 font-bold text-zinc-800">{log.recipient_name}</td>
                          <td className="px-6 py-4 font-mono font-bold text-zinc-500">{log.recipient_phone}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-zinc-800 text-xs">{sInfo.name}</span>
                              <span className="font-mono text-[10px] text-zinc-400">
                                {sInfo.phone !== "No Number paired" ? `+${sInfo.phone}` : "No number"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-sm line-clamp-1 truncate text-zinc-500 mt-2">{log.message}</td>
                          <td className="px-6 py-4 text-zinc-400 font-medium font-mono">{new Date(log.sent_at || log.created_at || "").toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${
                              log.status === "seen"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : log.status === "unseen"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : log.status === "blocked"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : log.status === "deleted"
                                ? "bg-zinc-150 text-zinc-850 border border-zinc-200 line-through"
                                : log.status === "queued" || log.status === "pending"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse"
                                : log.status === "delivered"
                                ? "bg-teal-100 text-teal-850 border border-teal-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}>
                              {log.status === "seen" && <Eye size={10} />}
                              {log.status === "unseen" && <EyeOff size={10} />}
                              {log.status === "blocked" && <ShieldX size={10} />}
                              {log.status === "deleted" && <Trash2 size={10} />}
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[10px] text-zinc-400 italic">
                            {log.status === "blocked" ? "Banned/Blocked line callback" : log.status === "deleted" ? "Customer retracted/revoked msg" : "-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => {
                                  setWebhookMessageId(String(log.id));
                                  setWebhookSimulationStatus("seen");
                                  toast.success(`Selected "${log.recipient_name}" for sandbox webhook! Click "Trigger Webhook Log" above to run.`);
                                }}
                                className="px-2 py-1 hover:bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-600 border border-zinc-200"
                              >
                                Mock Webhook
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SYSTEM OVERLAYS FOR CRM RECORDS MAINTENANCE */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">✏️ Edit WhatsApp Line Channel</h3>
              <button onClick={() => setEditingAccount(null)} className="text-zinc-400 hover:text-zinc-605 p-1 bg-zinc-50 rounded-full transition-all"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Channel / Connection Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  value={editAccPhone}
                  onChange={(e) => setEditAccPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200 rounded-xl text-xs uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateAccount(editingAccount.id, editAccName, editAccPhone)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase transition-all"
              >
                Save Connection Details
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">✏️ Edit Messaging Campaign</h3>
              <button onClick={() => setEditingCampaign(null)} className="text-zinc-400 hover:text-zinc-655 p-1 bg-zinc-50 rounded-full transition-all"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Campaign Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={editCampName}
                  onChange={(e) => setEditCampName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Template Message</label>
                <textarea 
                  rows={4}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={editCampMsg}
                  onChange={(e) => setEditCampMsg(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Rate-Limit Spacing Delay (Seconds)</label>
                <input 
                  type="number"
                  max={60}
                  min={1}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  value={editCampDelay}
                  onChange={(e) => setEditCampDelay(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setEditingCampaign(null)}
                className="px-4 py-2 bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200 rounded-xl text-xs uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateCampaign(editingCampaign.id, editCampName, editCampMsg, editCampDelay)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">✏️ Maintain Document / Invoice Record</h3>
              <button onClick={() => setEditingDoc(null)} className="text-zinc-400 hover:text-zinc-650 p-1 bg-zinc-50 rounded-full transition-all"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Client / Recipient Name</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                    value={editDocName}
                    onChange={(e) => setEditDocName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Recipient Phone</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono"
                    value={editDocPhone}
                    onChange={(e) => setEditDocPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Billed Sum (Rs)</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono"
                    value={editDocAmount}
                    onChange={(e) => setEditDocAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Reference ID</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono"
                    value={editDocRef}
                    onChange={(e) => setEditDocRef(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Billed Service / Items Description</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  value={editDocItems}
                  onChange={(e) => setEditDocItems(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Tracking Status</label>
                <select
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700"
                  value={editDocStatus}
                  onChange={(e) => setEditDocStatus(e.target.value)}
                >
                  <option value="sent">Sent / Outbox</option>
                  <option value="pending">Pending Payment</option>
                  <option value="paid">Paid successfully</option>
                  <option value="failed">Failed Delivery</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200 rounded-xl text-xs uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateDoc(editingDoc.id, editDocName, editDocPhone, editDocAmount, editDocItems, editDocRef, editDocStatus)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase transition-all"
              >
                Update Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
