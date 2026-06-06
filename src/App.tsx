import React, { useState, useEffect } from 'react';
import { 
  Hospital, 
  Milk, 
  LayoutDashboard, 
  PlusCircle, 
  Plus,
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronRight,
  Search,
  Filter,
  Shield,
  Download,
  Calendar,
  Send,
  Trash2,
  Edit,
  X,
  Share,
  FileText,
  Video,
  Copy,
  RotateCcw,
  MapPin,
  Globe,
  Mail,
  Upload,
  Navigation,
  Box,
  Layers,
  FileBarChart,
  Camera,
  Cake,
  Heart,
  Menu,
  AlertTriangle,
  ShieldCheck,
  Database,
  Info,
  Smartphone,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, parseISO, differenceInYears, isValid } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { HospitalEntry, DairyEntry, Template, MessageLog, MediaItem } from './types';
import WhatsAppCRM from './components/WhatsAppCRM';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200" 
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className }: any) => (
  <div className={cn("bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className, ...props }: any) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
  };
  return (
    <button 
      className={cn("px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50", variants[variant as keyof typeof variants], className)}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
    <input 
      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
    <select 
      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all bg-white"
      {...props}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const ManualSelect = ({ label, options, value, onChange, ...props }: any) => {
  const [isManual, setIsManual] = React.useState(false);

  React.useEffect(() => {
    if (value && options.length > 0 && !options.some((opt: any) => opt.value === value)) {
      setIsManual(true);
    }
  }, [value, options]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <button 
          type="button" 
          onClick={() => setIsManual(!isManual)}
          className="text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {isManual ? "Switch to List" : "Manual Entry"}
        </button>
      </div>
      {isManual ? (
        <input 
          className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label}...`}
          {...props}
        />
      ) : (
        <select 
          className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all bg-white"
          value={value}
          onChange={onChange}
          {...props}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
};

const FileInput = ({ label, onChange, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
    <div className="relative">
      <input 
        type="file" 
        className="hidden" 
        id={props.name} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              onChange(reader.result);
            };
            reader.readAsDataURL(file);
          }
        }}
        {...props}
      />
      <label 
        htmlFor={props.name}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 border-dashed hover:border-zinc-900 hover:bg-zinc-50 cursor-pointer transition-all text-sm text-zinc-500"
      >
        <PlusCircle size={16} />
        Choose File
      </label>
    </div>
  </div>
);

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", 
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const UP_DISTRICTS_DATA: Record<string, { blocks: string[], cities: string[] }> = {
  "Basti": {
    blocks: ["Basti Sadar", "Bahadurpur", "Bankati", "Dubaulya", "Gaur", "Harraiya", "Kaptanganj", "Kudraha", "Parasrampur", "Ramnagar", "Rudhauli", "Saltaua Gopalpur", "Saon Ghat", "Vikramjot"],
    cities: ["Basti", "Harraiya", "Rudhauli", "Babhnan", "Bhanpur"]
  },
  "Gonda": {
    blocks: ["Belsar", "Babhanjot", "Chhapia", "Colonelganj", "Haldharmau", "Itia Thok", "Jhanjhari", "Katra Bazar", "Mankapur", "Mujehna", "Nawabganj", "Pandri Kripal", "Paraspur", "Rupaidih", "Tarabganj", "Wazirganj"],
    cities: ["Gonda", "Colonelganj", "Nawabganj", "Katra", "Mankapur", "Khargupur", "Paraspur", "Tarabganj"]
  },
  "Balrampur": {
    blocks: ["Balrampur", "Gainsari", "Harriya Satgharwa", "Pachperwa", "Rehera Bazaar", "Shriduttganj", "Tulsipur", "Utraula"],
    cities: ["Balrampur", "Tulsipur", "Utraula", "Pachperwa", "Gainsari"]
  },
  "Ambedkar Nagar": {
    blocks: ["Akbarpur", "Baskhari", "Bhiti", "Bhiyaon", "Jalalpur", "Jahangir Ganj", "Katehari", "Ramnagar", "Tanda"],
    cities: ["Akbarpur", "Tanda", "Jalalpur", "Baskhari", "Katehari"]
  },
  "Sant Kabir Nagar": {
    blocks: ["Baghauli", "Belhar Kala", "Hainsar Bazar", "Khalilabad", "Mehdawal", "Nath Nagar", "Pauli", "Semariyawan", "Santha"],
    cities: ["Khalilabad", "Maghar", "Mehdawal", "Hariharpur", "Ledwa Mahua"]
  },
  "Siddharth Nagar": {
    blocks: ["Bansi", "Barhni", "Birdpur", "Domariyaganj", "Itwa", "Jogia", "Khunwa", "Lotan", "Naugarh", "Shohratgarh", "Uska Bazar"],
    cities: ["Naugarh", "Bansi", "Itwa", "Domariyaganj", "Shohratgarh", "Barhni Bazar"]
  }
};

// --- Main App ---

export default function App() {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable inspection shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return;
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'staff' } | null>(null);
  
  // Real-time backend connectivity diagnostic check
  const [dbStatus, setDbStatus] = useState<{
    apiStatus: 'checking' | 'online' | 'offline';
    supabaseConfigured: boolean | null;
    supabaseReachable: boolean | null;
    usingVpsRedirect: boolean;
    vpsUrlUsed: string;
    vpsReached: boolean | null;
    errorDetails?: string;
  }>({
    apiStatus: 'checking',
    supabaseConfigured: null,
    supabaseReachable: null,
    usingVpsRedirect: false,
    vpsUrlUsed: '',
    vpsReached: null
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const rawUrl = (import.meta as any).env.VITE_API_URL || '';
        const isRawDev = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
        const isClientLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        const isDevOrPreview = window.location.hostname.includes('run.app') || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';

        const shouldUseVps = rawUrl && 
                             rawUrl.startsWith('http') && 
                             !rawUrl.includes('your-ubuntu-vps-ip') && 
                             !(isRawDev && !isClientLocal);

        let testUrl = '/api/health';
        let stateVpsUrl = '';
        if (!isDevOrPreview && shouldUseVps) {
          const cleanBase = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
          testUrl = `${cleanBase}/api/health`;
          stateVpsUrl = cleanBase;
        }

        console.log(`[DIAGNOSTICS] Starting backend ping: "${testUrl}"`);
        const res = await fetch(testUrl);
        if (!res.ok) {
          throw new Error(`API health check returned HTTP status ${res.status}`);
        }

        const data = await res.json();
        console.log("[DIAGNOSTICS] Health response payload received:", data);

        let dbReachable = false;
        let dbDetails = '';
        if (data.supabase_configured) {
          // If supabase is configured on the backend, check if it is reachable
          const testDbUrl = shouldUseVps && !isDevOrPreview 
            ? `${stateVpsUrl}/api/db-test` 
            : '/api/db-test';
          
          try {
            const dbRes = await fetch(testDbUrl);
            const dbData = await dbRes.json();
            if (dbRes.ok && dbData.success) {
              dbReachable = true;
            } else {
              dbDetails = dbData.message || dbData.error || "Database test returned error state";
            }
          } catch (dbErr: any) {
            dbDetails = dbErr.message || String(dbErr);
          }
        } else {
          dbDetails = "Supabase URL/Key environment variables are missing on the backend. Serving in local-fallback mode.";
        }

        setDbStatus({
          apiStatus: 'online',
          supabaseConfigured: !!data.supabase_configured,
          supabaseReachable: dbReachable,
          usingVpsRedirect: !!shouldUseVps && !isDevOrPreview,
          vpsUrlUsed: stateVpsUrl,
          vpsReached: true,
          errorDetails: dbDetails
        });

      } catch (err: any) {
        console.error("[DIAGNOSTICS] Connection check aborted due to error:", err);
        setDbStatus({
          apiStatus: 'offline',
          supabaseConfigured: false,
          supabaseReachable: false,
          usingVpsRedirect: false,
          vpsUrlUsed: '',
          vpsReached: false,
          errorDetails: err.message || String(err)
        });
      }
    };
    
    runDiagnostics();
  }, [user]);

  const [activeModule, setActiveModule] = useState<'Hospital' | 'Dairy'>('Hospital');
  const [activeTab, setActiveTab] = useState('global');
  const [blockedPopupUrl, setBlockedPopupUrl] = useState<string | null>(null);
  const [blockedPopupName, setBlockedPopupName] = useState<string>("");
  const [hospitalEntries, setHospitalEntries] = useState<HospitalEntry[]>([]);
  const [dairyEntries, setDairyEntries] = useState<DairyEntry[]>([]);
  const [hospitalCount, setHospitalCount] = useState<number | null>(null);
  const [dairyCount, setDairyCount] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<number | null>(null);
  const [directMessage, setDirectMessage] = useState({ phone: '', name: '', message: '', templateId: '' });
  const [directMessageStatus, setDirectMessageStatus] = useState('');
  const [showAppDirectNameSuggestions, setShowAppDirectNameSuggestions] = useState(false);
  const [showAppDirectPhoneSuggestions, setShowAppDirectPhoneSuggestions] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState<{ phone: string, name: string, type: string } | null>(null);
  const [attachmentGuide, setAttachmentGuide] = useState<{ phone: string, name: string, message: string, media: any } | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [showBulkGreetingsModal, setShowBulkGreetingsModal] = useState(false);
  const [bulkCampaignName, setBulkCampaignName] = useState('');
  const [bulkCampaignTemplate, setBulkCampaignTemplate] = useState('');
  const [bulkCampaignDelay, setBulkCampaignDelay] = useState(5);
  const [bulkCampaignMediaId, setBulkCampaignMediaId] = useState<number | null>(null);
  const [bulkSendTarget, setBulkSendTarget] = useState('all');
  const [bulkSendSelectedSubValue, setBulkSendSelectedSubValue] = useState('');
  const [bulkSelectedTemplateId, setBulkSelectedTemplateId] = useState('');
  const [bulkCustomMessage, setBulkCustomMessage] = useState('');
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [viewPasswordId, setViewPasswordId] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>({
    institution_name: 'Shri Krishna Mission Hospital',
    contact_number: '91 9918922900',
    full_address: 'Shri Krishna Nagar, Dhorika Road, Bargodwa Near Bodewan, Basti-272001, Uttar Pradesh',
    hospital_name: 'Shri Krishna Mission H',
    whatsapp_api_key: '',
    auto_birthday: false,
    auto_anniversary: false,
    logo_url: ''
  });
  const handleAddTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      module: activeModule,
      name: formData.get('name') as string,
      content: formData.get('content') as string,
      type: formData.get('type') as string,
    };

    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        setShowAddTemplateModal(false);
        setEditingTemplate(null);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Failed to save template: ${errData.message || errData.error || "Server error"}`);
      }
    } catch (err) {
      toast.error("Failed to save template: Network connection error");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    showConfirm({
      title: "Delete Template?",
      message: "Are you sure you want to delete this template?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Template deleted");
            fetchData();
          }
        } catch (err) {
          toast.error("Failed to delete template");
        }
      }
    });
  };

  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSaveStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      module: activeModule,
      name: formData.get('name'),
      username: formData.get('username'),
      password: formData.get('password'),
    };

    try {
      const url = editingStaff ? `/api/staff_accounts/${editingStaff.id}` : '/api/staff_accounts';
      const method = editingStaff ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success(editingStaff ? "Staff updated" : "Staff added");
        setShowStaffModal(false);
        setEditingStaff(null);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save staff");
    }
  };

  const handleDeleteStaff = async (id: number) => {
    showConfirm({
      title: "Delete Staff Account?",
      message: "Are you sure you want to delete this staff member account?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/staff_accounts/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Staff deleted");
            fetchData();
          }
        } catch (err) {
          toast.error("Failed to delete staff");
        }
      }
    });
  };

  // State Master State
  const [stateMasterList, setStateMasterList] = useState<{ id: number, name: string }[]>([
    { id: 3, name: "Assam" },
    { id: 4, name: "Bihar" },
    { id: 5, name: "Chhattisgarh" },
    { id: 6, name: "Goa" },
    { id: 7, name: "Gujarat" },
    { id: 8, name: "Haryana" },
    { id: 9, name: "Himachal Pradesh" },
    { id: 10, name: "Jharkhand" },
    { id: 11, name: "Karnataka" },
    { id: 12, name: "Kerala" },
    { id: 13, name: "Madhya Pradesh" },
    { id: 14, name: "Maharashtra" },
    { id: 15, name: "Manipur" },
    { id: 16, name: "Meghalaya" },
    { id: 17, name: "Mizoram" },
    { id: 18, name: "Nagaland" },
    { id: 19, name: "Odisha" },
    { id: 20, name: "Punjab" },
    { id: 21, name: "Rajasthan" },
    { id: 22, name: "Sikkim" },
    { id: 23, name: "Tamil Nadu" },
    { id: 24, name: "Telangana" },
    { id: 25, name: "Tripura" },
    { id: 26, name: "Uttar Pradesh" },
    { id: 27, name: "Uttarakhand" },
    { id: 28, name: "West Bengal" },
    { id: 29, name: "Andaman and Nicobar Islands" },
    { id: 30, name: "Chandigarh" },
    { id: 31, name: "Dadra and Nagar Haveli and Daman and Diu" },
    { id: 32, name: "Delhi" },
    { id: 33, name: "Jammu and Kashmir" },
    { id: 34, name: "Ladakh" },
    { id: 35, name: "Lakshadweep" },
    { id: 36, name: "Puducherry" }
  ]);
  const [newStateName, setNewStateName] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [editingStateId, setEditingStateId] = useState<number | null>(null);

  // District Master State
  const [districtMasterList, setDistrictMasterList] = useState<{ id: number, state: string, name: string }[]>([
    { id: 1, state: "Uttar Pradesh", name: "Basti" },
    { id: 2, state: "Uttar Pradesh", name: "Gonda" },
    { id: 3, state: "Uttar Pradesh", name: "Balrampur" },
    { id: 4, state: "Uttar Pradesh", name: "Ambedkar Nagar" },
    { id: 5, state: "Uttar Pradesh", name: "Sant Kabir Nagar" },
    { id: 6, state: "Uttar Pradesh", name: "Siddharth Nagar" }
  ]);
  const [newDistrictName, setNewDistrictName] = useState('');
  const [newDistrictState, setNewDistrictState] = useState('Uttar Pradesh');
  const [districtSearch, setDistrictSearch] = useState('');
  const [editingDistrictId, setEditingDistrictId] = useState<number | null>(null);

  // Block Master State
  const [blockMasterList, setBlockMasterList] = useState<{ id: number, district: string, name: string }[]>([
    { id: 1, district: "Ambedkar Nagar", name: "Akbarpur" },
    { id: 2, district: "Ambedkar Nagar", name: "Baskhari" },
    { id: 3, district: "Ambedkar Nagar", name: "Bheeti" },
    { id: 4, district: "Ambedkar Nagar", name: "Bhiyaon" },
    { id: 5, district: "Ambedkar Nagar", name: "Jahangirganj" }
  ]);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockDistrict, setNewBlockDistrict] = useState('');
  const [blockSearch, setBlockSearch] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);

  // Post Master State
  const [postMasterList, setPostMasterList] = useState<{ id: number, state: string, district: string, name: string, pincode: string }[]>([
    { id: 1, state: "Uttar Pradesh", district: "Basti", name: "Basti", pincode: "272001" },
    { id: 2, state: "Uttar Pradesh", district: "Basti", name: "Civil Line Basti", pincode: "272001" },
    { id: 3, state: "Uttar Pradesh", district: "Basti", name: "Gandhinagar Basti", pincode: "272001" },
    { id: 4, state: "Uttar Pradesh", district: "Basti", name: "ITI Basti", pincode: "272001" },
    { id: 5, state: "Uttar Pradesh", district: "Basti", name: "Purani Basti", pincode: "272002" },
    { id: 6, state: "Uttar Pradesh", district: "Basti", name: "Pandey Bazar", pincode: "272002" }
  ]);
  const [newPostName, setNewPostName] = useState('');
  const [newPostState, setNewPostState] = useState('Uttar Pradesh');
  const [newPostDistrict, setNewPostDistrict] = useState('Basti');
  const [newPostPincode, setNewPostPincode] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const entries = activeModule === 'Hospital' ? hospitalEntries : dairyEntries;
  
  // Highlighting duplicates logic
  const phoneCount = entries.reduce((acc: any, curr: any) => {
    if (curr.phone) {
      acc[curr.phone] = (acc[curr.phone] || 0) + 1;
    }
    return acc;
  }, {});

  const handleDeleteEntry = async (id: any) => {
    showConfirm({
      title: "Delete Entry Permanently?",
      message: "Are you sure you want to delete this record? This action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/${activeModule.toLowerCase()}/entries/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            toast.success("Entry deleted successfully", { icon: '🗑️' });
            await fetchData();
          } else {
            const errData = await res.json().catch(() => ({}));
            toast.error(`Failed to delete: ${errData.message || 'Server error'}`);
          }
        } catch (err) {
          toast.error("Network error while deleting");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleClearAllData = async () => {
    showConfirm({
      title: "⚠️ DANGER: CLEAR ALL DATA?",
      message: "This will permanently delete ALL entries entered under this module. This cannot be undone. Please type 'DELETE' to confirm.",
      confirmText: "Confirm Clear",
      cancelText: "Cancel",
      requireInputMatch: "DELETE",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/${activeModule.toLowerCase()}/entries`, {
            method: 'DELETE'
          });
          if (res.ok) {
            toast.success(`All ${activeModule} data cleared successfully`, { icon: '🔥' });
            await fetchData();
          } else {
            toast.error("Failed to clear data");
          }
        } catch (err) {
          toast.error("Network error while clearing data");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  // Report Filter States
  const [reportFilters, setReportFilters] = useState({
    village: '',
    post: '',
    state: '',
    district: '',
    block: '',
    pincode: '',
    search: ''
  });

  const [appliedReportFilters, setAppliedReportFilters] = useState({
    village: '',
    post: '',
    state: '',
    district: '',
    block: '',
    pincode: '',
    search: ''
  });

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formFiles, setFormFiles] = useState<{ photo?: string; id_card?: string; aadhaar_card?: string }>({});
  const [locationData, setLocationData] = useState<{ 
    city: string; 
    state: string; 
    district: string; 
    block: string;
    village: string;
    post: string;
    cities: string[];
    districts: string[];
    blocks: string[];
    villages: string[];
  }>({ 
    city: '', 
    state: '', 
    district: '', 
    block: '',
    village: '',
    post: '',
    cities: [], 
    districts: [],
    blocks: [], 
    villages: [] 
  });

  const [importingFile, setImportingFile] = useState<File | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    requireInputMatch?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState('');

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    requireInputMatch?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmInput('');
    setConfirmDialog({
      isOpen: true,
      ...options
    });
  };

  const [pasteData, setPasteData] = useState('');

  const parseAndUploadRawData = async () => {
    if (!pasteData.trim()) return toast.error("Please paste some data first");
    
    // Scoped quotes-preserving CSV helper
    const parseCsvLine = (text: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    try {
      const lines = pasteData.trim().split('\n').filter(l => {
        // Skip totally empty or comma-only placeholder lines
        const clean = l.replace(/,/g, '').trim();
        return clean.length > 0;
      });

      const entries = lines.map(line => {
        // Detect separator: comma, tab, or double space
        let parts: string[] = [];
        if (line.includes('\t')) {
          parts = line.split('\t').map(p => p.trim());
        } else if (line.includes(',')) {
          parts = parseCsvLine(line);
        } else if (line.split(/\s{2,}/).length > 2) {
          parts = line.split(/\s{2,}/).map(p => p.trim());
        } else {
          parts = line.split(',').map(p => p.trim());
        }
        
        // Detect offset base (shifting past initial empty Excel columns)
        const os = (parts[0] === '' && parts.length > 1) ? 1 : 0;
        const actualParts = parts.slice(os);

        // Skip header rows (e.g. if actualParts[0] is "ID" or "Name")
        if (actualParts[0]?.toLowerCase() === 'id' || actualParts[0]?.toLowerCase() === 'name') return null;
        
        // Simple heuristic to ignore empty/garbage lines
        if (actualParts.length < 2) return null;

        let id, name, father, phone, dob, anniversary, age, village, block, department, district, state;
        
        // Smart mapping based on column count and simple heuristics
        if (actualParts.length >= 8) {
          // Indian Excel format mapping:
          // ID(0), Name(1), Father(2), Phone(3), DOB(4), Anniv(5), Age(6), Village(7), Block(8), Dept(9), District(10)
          id = actualParts[0];
          name = actualParts[1];
          father = actualParts[2];
          phone = actualParts[3];
          dob = actualParts[4];
          anniversary = actualParts[5];
          age = actualParts[6];
          village = actualParts[7];
          block = actualParts[8];
          department = actualParts[9];
          district = actualParts[10];
        } else if (actualParts.length === 4 || actualParts.length === 5) {
          // Minimal format: [ID], Name, Phone, DOB, State
          if (actualParts.length === 5) {
            id = actualParts[0];
            name = actualParts[1];
            phone = actualParts[2];
            dob = actualParts[3];
            state = actualParts[4];
          } else {
            name = actualParts[0];
            phone = actualParts[1];
            dob = actualParts[2];
            state = actualParts[3];
          }
        } else {
          // General fallback guess
          id = actualParts[0];
          name = actualParts[1];
          phone = actualParts[2];
          dob = actualParts[3];
          village = actualParts[4];
          block = actualParts[5];
          district = actualParts[6];
          age = actualParts[7];
        }

        const finalId = parseInt(id || '') || Math.floor(Date.now() + Math.random() * 1000000);
        const finalName = (name && name.trim()) ? name.trim() : (activeModule === 'Hospital' ? `Patient #${finalId}` : `Farmer #${finalId}`);
        
        let finalPhone = String(phone || '').replace(/[^0-9]/g, '') || '';
        // Prefix with Indian country code "91" if 10 digits
        if (finalPhone.length === 10) {
          finalPhone = '91' + finalPhone;
        }

        const finalAge = parseInt(age || '0') || 0;
        const finalDob = parseDateToYYYYMMDD(dob);
        const finalAnniversary = parseDateToYYYYMMDD(anniversary);

        return {
          id: finalId,
          name: finalName,
          father_husband: father || '',
          phone: finalPhone,
          dob: finalDob,
          anniversary: finalAnniversary,
          age: finalAge,
          village: village || '',
          block: block || '',
          district: district || '',
          state: state || 'Uttar Pradesh',
          department: department || 'General',
          type: activeModule === 'Hospital' ? 'Patient' : 'Farmer',
          created_at: new Date().toISOString()
        };
      }).filter(Boolean);

      if (entries.length === 0) return toast.error("No valid records found in the pasted data");

      console.log('Sending entries to bulk upload:', entries);

      const res = await fetch(`/api/${activeModule.toLowerCase()}/bulk_upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.message && result.message.includes('local server storage')) {
          toast.success(`${result.count} records saved to local fallback (DB Restricted)`);
        } else {
          toast.success(`Successfully uploaded ${result.count || entries.length} records!`);
        }
        setPasteData('');
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const detailedError = errData.dbError || errData.error || errData.message || res.statusText || 'Database Error';
        toast.error(`Upload failed: ${detailedError}`, { duration: 6000 });
        console.error('Upload error details:', errData);
      }
    } catch (err) {
      console.error('Parsing error:', err);
      toast.error("Parsing failed. Check data format.");
    }
  };

  const parseDateToYYYYMMDD = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // Excel serial dates handling
    const num = Number(str);
    if (!isNaN(num) && num > 25569 && num < 100000) {
      try {
        const date = new Date((num - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (_) {}
    }

    // Capture standard separators (1-4 digits for year/day/month)
    const separatorMatch = str.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
    if (separatorMatch) {
      const part1 = separatorMatch[1];
      const part2 = separatorMatch[2];
      const part3 = separatorMatch[3];
      
      let year = '';
      let month = '';
      let day = '';

      if (part1.length === 4) {
        year = part1;
        month = part2;
        day = part3;
      } else {
        year = part3;
        month = part2;
        day = part1;
      }

      day = day.padStart(2, '0');
      month = month.padStart(2, '0');

      let yNum = parseInt(year);
      if (yNum < 100) {
        year = String(2000 + yNum);
      }

      // Dynamic month-day swap for US formatting (e.g. 12/30/2025)
      const dNum = parseInt(day);
      const mNum = parseInt(month);
      if (mNum > 12 && dNum <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }

      const finalMonthNum = parseInt(month);
      const finalDayNum = parseInt(day);
      if (finalMonthNum >= 1 && finalMonthNum <= 12 && finalDayNum >= 1 && finalDayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (_) {}

    return null;
  };

  const handleExcelImport = async () => {
    if (!importingFile) return toast.error("Please select a file first");
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Output raw grid array for content analysis so that blank rows/cols don't slide indices
        const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        if (!sheetRows || sheetRows.length === 0) {
          throw new Error("No data found in file");
        }

        console.log(`Processing Excel worksheet: ${sheetRows.length} total rows detected...`);

        // Find the best header row index
        let headerRowIdx = -1;
        let bestMatchCount = 0;
        
        const allKeywords = [
          'name', 'नाम', 'fullname', 'patient', 'farmer', 'customer', 'client', 'candidate', 'member',
          'phone', 'mobile', 'contact', 'whatsapp', 'मोबाइल', 'फ़ोन', 'फोन', 'tele', 'cell',
          'father', 'husband', 'पति', 'पिता', 'parent', 'guardian',
          'dob', 'birth', 'bday', 'जन्म', 'birthday', 'anniversary', 'wedding', 'marriage', 'शादी', 'सालगिरह',
          'village', 'address', 'location', 'गांव', 'ग्राम', 'पता',
          'block', 'tehsil', 'taluka', 'ब्लॉक', 'तहसील',
          'district', 'dist', 'zila', 'जिला',
          'pincode', 'pin', 'zip', 'पिन'
        ];
        
        for (let i = 0; i < Math.min(20, sheetRows.length); i++) {
          const row = sheetRows[i];
          if (!row || !Array.isArray(row)) continue;
          let matchCount = 0;
          row.forEach(cell => {
            const strVal = String(cell || '').toLowerCase().trim();
            if (allKeywords.some(kw => strVal.includes(kw))) {
              matchCount++;
            }
          });
          if (matchCount > bestMatchCount) {
            bestMatchCount = matchCount;
            headerRowIdx = i;
          }
        }

        const colMappings: Record<number, string> = {};
        const headerRow = headerRowIdx >= 0 ? sheetRows[headerRowIdx] : [];
        
        if (headerRowIdx >= 0 && bestMatchCount >= 2) {
          console.log(`Header row identified at index ${headerRowIdx} with ${bestMatchCount} column matches.`);
          headerRow.forEach((cell, colIdx) => {
            const h = String(cell || '').toLowerCase().trim();
            if (!h) return;
            
            // Map keywords to standard schemas
            if (['name', 'नाम', 'fullname', 'patient name', 'farmer name', 'full name', 'candidate name', 'customer name', 'client name'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'name';
            } else if (['phone', 'mobile', 'contact', 'whatsapp', 'मोबाइल', 'फ़ोन', 'फोन', 'contact no', 'mobile no'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'phone';
            } else if (['father', 'husband', 'पति', 'पिता', 'father / husband', 'father/husband', 'guardian'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'father_husband';
            } else if (['dob', 'birth', 'bday', 'जन्म', 'birthday', 'date of birth', 'birth date'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'dob';
            } else if (['anniversary', 'wedding', 'marriage', 'शादी', 'सालगिरह', 'wedding date', 'marriage date'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'anniversary';
            } else if (['village', 'village name', 'rural', 'town', 'गांव', 'ग्राम', 'village_name'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'village';
            } else if (['address', 'location', 'पता'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'village';
            } else if (['block', 'tehsil', 'taluka', 'ब्लॉक', 'तहसील'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'block';
            } else if (['district', 'dist', 'zila', 'जिला'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'district';
            } else if (['state', 'province', 'राज्य'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'state';
            } else if (['pincode', 'pin', 'zip', 'पिन', 'pin code'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'pincode';
            } else if (['post', 'po', 'डाक'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'post';
            } else if (['age', 'years', 'उम्र', 'आयु'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'age';
            } else if (['doctor', 'dr', 'physician', 'चिकित्सक', 'डॉक्टर'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'doctor';
            } else if (['department', 'dept', 'specialty', 'विभाग'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'department';
            } else if (['bmc', 'dpmc', 'center', 'centre'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'bmc_dpmc';
            } else if (['aadhar', 'aadhaar', 'uid', 'आधार', 'aadhar card', 'aadhaar card'].some(kw => h.includes(kw))) {
              colMappings[colIdx] = 'aadhar';
            } else if (h === 'id' || h === 's.no' || h === 's.no.' || h === 'sl' || h === 'serial') {
              colMappings[colIdx] = 'id';
            }
          });
        }

        // Detect total column count
        let maxCols = 0;
        const scanLimit = Math.min(sheetRows.length, 30);
        for (let i = 0; i < scanLimit; i++) {
          if (sheetRows[i] && sheetRows[i].length > maxCols) {
            maxCols = sheetRows[i].length;
          }
        }

        const dataStartIdx = headerRowIdx >= 0 && bestMatchCount >= 2 ? headerRowIdx + 1 : 0;

        // Content profiling across first few rows for unmapped columns or raw files without headers
        const colTypes: Record<number, { isNumeric: number; isPhone: number; isDate: number; isString: number; total: number; sampleValues: string[] }> = {};
        for (let c = 0; c < maxCols; c++) {
          colTypes[c] = { isNumeric: 0, isPhone: 0, isDate: 0, isString: 0, total: 0, sampleValues: [] };
          for (let r = dataStartIdx; r < Math.min(sheetRows.length, dataStartIdx + 30); r++) {
            const val = sheetRows[r]?.[c];
            if (val === undefined || val === null || String(val).trim() === "") continue;
            const strVal = String(val).trim();
            colTypes[c].total++;
            if (colTypes[c].sampleValues.length < 5) colTypes[c].sampleValues.push(strVal);

            // Date match
            if (strVal.match(/^(\d{1,4})[./-]\d{1,2}[./-](\d{1,4})$/)) {
              colTypes[c].isDate++;
            } else {
              const d = new Date(strVal);
              if (!isNaN(d.getTime()) && strVal.length >= 8 && isNaN(Number(strVal))) {
                colTypes[c].isDate++;
              }
            }

            // Phone match
            const digits = strVal.replace(/\D/g, '');
            if (digits.length >= 10 && digits.length <= 13) {
              colTypes[c].isPhone++;
            }

            // General checking
            if (!isNaN(Number(strVal))) {
              colTypes[c].isNumeric++;
            } else if (strVal.length > 2) {
              colTypes[c].isString++;
            }
          }
        }

        const alreadyMappedKeys = new Set(Object.values(colMappings));

        // Auto-assign phone
        if (!alreadyMappedKeys.has('phone')) {
          let bestColIdx = -1;
          let maxPct = 0.5;
          for (let c = 0; c < maxCols; c++) {
            if (colMappings[c]) continue;
            const t = colTypes[c];
            if (t && t.total > 0) {
              const pct = t.isPhone / t.total;
              if (pct > maxPct) {
                maxPct = pct;
                bestColIdx = c;
              }
            }
          }
          if (bestColIdx !== -1) {
            colMappings[bestColIdx] = 'phone';
            alreadyMappedKeys.add('phone');
            console.log(`Auto-detected Phone column at index ${bestColIdx}`);
          }
        }

        // Auto-assign dates (DOB / Anniversary)
        const dateCols: number[] = [];
        for (let c = 0; c < maxCols; c++) {
          if (colMappings[c]) continue;
          const t = colTypes[c];
          if (t && t.total > 0 && (t.isDate / t.total > 0.4)) {
            dateCols.push(c);
          }
        }
        if (dateCols.length > 0) {
          if (!alreadyMappedKeys.has('dob')) {
            colMappings[dateCols[0]] = 'dob';
            alreadyMappedKeys.add('dob');
            console.log(`Auto-detected Date of Birth col at index ${dateCols[0]}`);
            if (dateCols.length > 1 && !alreadyMappedKeys.has('anniversary')) {
              colMappings[dateCols[1]] = 'anniversary';
              alreadyMappedKeys.add('anniversary');
              console.log(`Auto-detected Anniversary col at index ${dateCols[1]}`);
            }
          } else if (!alreadyMappedKeys.has('anniversary')) {
            colMappings[dateCols[0]] = 'anniversary';
            alreadyMappedKeys.add('anniversary');
            console.log(`Auto-detected Anniversary col at index ${dateCols[0]}`);
          }
        }

        // Auto-assign Name
        if (!alreadyMappedKeys.has('name')) {
          let bestColIdx = -1;
          let bestScore = 0;
          for (let c = 0; c < Math.min(maxCols, 5); c++) {
            if (colMappings[c]) continue;
            const t = colTypes[c];
            if (t && t.total > 0) {
              const pctStringOnly = t.isString / t.total;
              if (pctStringOnly > 0.7 && t.isNumeric === 0) {
                const score = pctStringOnly * (5 - c);
                if (score > bestScore) {
                  bestScore = score;
                  bestColIdx = c;
                }
              }
            }
          }
          if (bestColIdx !== -1) {
            colMappings[bestColIdx] = 'name';
            alreadyMappedKeys.add('name');
            console.log(`Auto-detected Name column at index ${bestColIdx}`);
          }
        }

        // Auto-assign village / address
        if (!alreadyMappedKeys.has('village')) {
          let bestColIdx = -1;
          for (let c = 0; c < maxCols; c++) {
            if (colMappings[c]) continue;
            const t = colTypes[c];
            if (t) {
              const hasVillVal = t.sampleValues.some(val => val.toLowerCase().includes('vill') || val.toLowerCase().includes('basti') || val.toLowerCase().includes('road'));
              if (hasVillVal) {
                bestColIdx = c;
                break;
              }
            }
          }
          if (bestColIdx !== -1) {
            colMappings[bestColIdx] = 'village';
            alreadyMappedKeys.add('village');
            console.log(`Auto-detected Village/Address col at index ${bestColIdx}`);
          }
        }

        // Direct standard fallbacks if indices 0 or 1 remain completely empty/unmapped
        if (!alreadyMappedKeys.has('name') && !colMappings[1] && colTypes[1]?.total > 0) {
          colMappings[1] = 'name';
          alreadyMappedKeys.add('name');
        }
        if (!colMappings[0] && colTypes[0]?.isNumeric > 0) {
          colMappings[0] = 'id';
        }

        console.log("Final Column Mappings Applied:", colMappings);

        const entries: any[] = [];
        for (let r = dataStartIdx; r < sheetRows.length; r++) {
          const row = sheetRows[r];
          if (!row || row.length === 0) continue;
          
          const isRowEmpty = row.every(cell => cell === undefined || cell === null || String(cell).trim() === "");
          if (isRowEmpty) continue;

          const obj: any = {};
          row.forEach((cell, colIdx) => {
            const schemaKey = colMappings[colIdx];
            if (schemaKey) {
              obj[schemaKey] = cell;
            }
          });

          // Finalise ID
          let finalId = parseInt(String(obj.id));
          if (isNaN(finalId) || finalId <= 0) {
            finalId = Math.floor(Date.now() + Math.random() * 1000000);
          }

          // Build clean record according to schema specifications
          const cleanObj: any = {
            id: finalId,
            type: obj.type || (activeModule === 'Hospital' ? 'Patient' : 'Farmer')
          };

          const validSchemaFields = [
            'type', 'name', 'father_husband', 'phone', 'pincode', 'city', 'state', 
            'dob', 'anniversary', 'age', 'village', 'post', 'block', 'district', 
            'doctor', 'department', 'photo', 'id_card', 'password', 'created_at',
            'aadhar', 'bmc_dpmc', 'aadhaar_card'
          ];

          validSchemaFields.forEach(col => {
            if (col === 'id') return;
            let val = obj[col];
            if (val === undefined || val === null) {
              cleanObj[col] = col === 'age' ? 0 : '';
              return;
            }

            let strVal = String(val).trim();

            if (col === 'phone') {
              if (strVal.endsWith('.0')) {
                strVal = strVal.slice(0, -2);
              }
              strVal = strVal.replace(/[^0-9]/g, '');
              if (strVal.length === 10) {
                strVal = '91' + strVal;
              }
              cleanObj[col] = strVal;
            } else if (col === 'dob' || col === 'anniversary') {
              const stdDate = parseDateToYYYYMMDD(strVal);
              cleanObj[col] = stdDate || '';
            } else if (col === 'age') {
              cleanObj[col] = isNaN(parseInt(strVal)) ? 0 : parseInt(strVal);
            } else {
              cleanObj[col] = strVal;
            }
          });

          // Secondary verification: if name got mapped to a serial code number (like 148, 149), auto-realign it to a text column!
          if (cleanObj.name && !isNaN(Number(cleanObj.name))) {
            const possibleNameIdx = row.findIndex((cell, idx) => {
              const strVal = String(cell).trim();
              return isNaN(Number(strVal)) && strVal.length > 2 && idx !== colMappings['phone'] && colMappings[idx] !== 'phone' && colMappings[idx] !== 'village';
            });
            if (possibleNameIdx !== -1) {
              cleanObj.name = String(row[possibleNameIdx]).trim();
              console.log(`Re-aligned S.No name '${obj.name}' to text name column value: '${cleanObj.name}'`);
            }
          }

          entries.push(cleanObj);
        }

        if (entries.length === 0) {
          throw new Error("No non-empty entries could be mapped from the file");
        }

        console.log(`Uploading ${entries.length} records to ${activeModule}...`);

        const res = await fetch(`/api/${activeModule.toLowerCase()}/bulk_upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries })
        });

        if (res.ok) {
          const result = await res.json();
          const count = result.count || entries.length;
          const msg = result.message ? ` (${result.message})` : "";
          toast.success(`Imported ${count} records successfully!${msg}`);
          fetchData();
        } else {
          const errorData = await res.json().catch(() => ({}));
          const errMsg = errorData.message || errorData.error || res.statusText;
          const dbError = errorData.dbError ? ` | DB: ${errorData.dbError}` : "";
          console.error("Bulk upload failed:", errorData);
          toast.error(`Import failed: ${errMsg}${dbError}`, { duration: 6000 });
        }
      } catch (err) {
        console.error("Import error:", err);
        toast.error(err instanceof Error ? err.message : "Error processing file");
      } finally {
        setLoading(false);
        setImportingFile(null);
      }
    };
    reader.readAsArrayBuffer(importingFile);
  };

  useEffect(() => {
    fetchData();
  }, [activeModule]);

  useEffect(() => {
    setSelectedEntryIds([]);
  }, [activeModule, activeTab]);

  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [campaignAccount, setCampaignAccount] = useState<number>(1);

  useEffect(() => {
    if (showBulkGreetingsModal) {
      fetch("/api/whatsapp/accounts")
        .then(res => res.json())
        .then(data => {
          setWhatsappAccounts(data || []);
          if (data && data.length > 0) {
            setCampaignAccount(data[0].id);
          } else {
            setCampaignAccount(1);
          }
        })
        .catch(() => setCampaignAccount(1));
    }
  }, [showBulkGreetingsModal]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        { key: 'hospital', url: '/api/hospital/entries', setter: setHospitalEntries },
        { key: 'dairy', url: '/api/dairy/entries', setter: setDairyEntries },
        { key: 'templates', url: `/api/templates/${activeModule}`, setter: setTemplates },
        { key: 'logs', url: `/api/logs/${activeModule}`, setter: setLogs },
        { key: 'media', url: `/api/media/${activeModule}`, setter: setMediaItems },
        { key: 'settings', url: `/api/settings/${activeModule}`, setter: setSettings },
        { key: 'states', url: `/api/masters/${activeModule}/state_master`, setter: setStateMasterList },
        { key: 'districts', url: `/api/masters/${activeModule}/district_master`, setter: setDistrictMasterList },
        { key: 'blocks', url: `/api/masters/${activeModule}/block_master`, setter: setBlockMasterList },
        { key: 'posts', url: `/api/masters/${activeModule}/post_master`, setter: setPostMasterList },
        { key: 'staff', url: `/api/staff_accounts/${activeModule}`, setter: setStaffAccounts },
      ];

      // Fetch dynamic dashboard exact counts
      try {
        const cntRes = await fetch(`/api/dashboard/counts?t=${Date.now()}`);
        if (cntRes.ok) {
          const cntData = await cntRes.json();
          setHospitalCount(cntData.hospital);
          setDairyCount(cntData.dairy);
        }
      } catch (cntErr) {
        console.error("Error fetching exact dashboard counts:", cntErr);
      }

      await Promise.all(endpoints.map(async (ep) => {
        try {
          // Use a timestamp to prevent browser caching
          const res = await fetch(`${ep.url}?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
            console.log(`Received ${count} records for ${ep.key}`);
            ep.setter(data || (ep.key === 'settings' ? {} : []));
          } else {
            console.warn(`Fetch failed for ${ep.key}: ${res.status}`);
          }
        } catch (err) {
          console.error(`Error fetching ${ep.key}:`, err);
        }
      }));
    } catch (globalErr) {
      console.error("Global fetch error:", globalErr);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          toast.success("Media uploaded successfully");
          fetchData();
        }
      } catch (err) {
        toast.error("Failed to upload media");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteMedia = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaToDelete(id);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    
    try {
      const res = await fetch(`/api/media/${mediaToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Media deleted successfully");
        if (selectedMediaId === mediaToDelete) setSelectedMediaId(null);
        setMediaToDelete(null);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to delete media");
      setMediaToDelete(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(formData.entries()),
      auto_birthday: settings.auto_birthday,
      auto_anniversary: settings.auto_anniversary
    };
    try {
      const res = await fetch(`/api/settings/${activeModule}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success("Settings saved successfully");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const usernameRaw = formData.get('username');
    const passwordRaw = formData.get('password');
    
    const username = String(usernameRaw || '').trim();
    const password = String(passwordRaw || '').trim();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, module: activeModule })
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        if (userData.role === 'staff') {
          setActiveTab('automation');
        }
        toast.success(`Welcome back, ${userData.username}!`);
        return;
      }
      
      // If we get here, the API call failed (e.g. 401, 503, 500, etc.)
      console.error(`API login failed with status: ${res.status}`);
      const errResponse = await res.json().catch(() => ({}));
      const apiDetail = errResponse.message || errResponse.error || `HTTP Status ${res.status}`;
      
      // Let's offer a local fallback login if username and password match standard configurations
      const vAdminId = (import.meta as any).env.VITE_ADMIN_ID || 'admin';
      const vAdminPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || '12345';
      const vStaffId = (import.meta as any).env.VITE_STAFF_ID || 'staff';
      const vStaffPass = (import.meta as any).env.VITE_STAFF_PASSWORD || '12345';

      const isLocalAdmin = (username.toLowerCase() === vAdminId.toLowerCase() || username.toLowerCase() === 'admin' || username.toLowerCase() === 'homecookingservice2025@gmail.com') && (password === vAdminPass || password === '12345');
      const isLocalStaff = (username.toLowerCase() === vStaffId.toLowerCase() || username.toLowerCase() === 'staff') && (password === vStaffPass || password === '12345');

      if (isLocalAdmin) {
        setUser({ username, role: 'admin' });
        toast.success(`Welcome back (Local Fallback), ${username}!`, { duration: 4000 });
        toast.error(`Backend API Note: ${apiDetail} (Verify your Vercel Environment Variables)`, { duration: 8000 });
        return;
      } else if (isLocalStaff) {
        setUser({ username, role: 'staff' });
        setActiveTab('automation');
        toast.success(`Welcome back (Local Fallback), ${username}!`, { duration: 4000 });
        toast.error(`Backend API Note: ${apiDetail} (Verify your Vercel Environment Variables)`, { duration: 8000 });
        return;
      }

      const errMsg = errResponse.message || errResponse.error || "Invalid username or password";
      toast.error(`Login Failed: ${errMsg}`);
    } catch (err) {
      console.error("Login connection error:", err);
      
      // Connection error local fallback
      const vAdminId = (import.meta as any).env.VITE_ADMIN_ID || 'admin';
      const vAdminPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || '12345';
      const vStaffId = (import.meta as any).env.VITE_STAFF_ID || 'staff';
      const vStaffPass = (import.meta as any).env.VITE_STAFF_PASSWORD || '12345';

      const isLocalAdmin = (username.toLowerCase() === vAdminId.toLowerCase() || username.toLowerCase() === 'admin' || username.toLowerCase() === 'homecookingservice2025@gmail.com') && (password === vAdminPass || password === '12345');
      const isLocalStaff = (username.toLowerCase() === vStaffId.toLowerCase() || username.toLowerCase() === 'staff') && (password === vStaffPass || password === '12345');

      if (isLocalAdmin) {
        setUser({ username, role: 'admin' });
        toast.success(`Welcome back (Offline Fallback), ${username}!`, { duration: 4000 });
        toast.error(`Backend connection offline. Verify your server is running or check your Vercel network status.`, { duration: 8000 });
        return;
      } else if (isLocalStaff) {
        setUser({ username, role: 'staff' });
        setActiveTab('automation');
        toast.success(`Welcome back (Offline Fallback), ${username}!`, { duration: 4000 });
        toast.error(`Backend connection offline. Verify your server is running or check your Vercel network status.`, { duration: 8000 });
        return;
      }

      toast.error("Network connection error. Please verify your backend API is online or try logging in with default credentials.");
    }
  };

  const fetchLocationByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data[0].Status === 'Success') {
        const postOffices = data[0].PostOffice;
        const districts = Array.from(new Set(postOffices.map((po: any) => po.District))) as string[];
        const blocks = Array.from(new Set(postOffices.map((po: any) => po.Block))) as string[];
        const villages = Array.from(new Set(postOffices.map((po: any) => po.Name))) as string[];
        
        const first = postOffices[0];
        setLocationData({
          city: first.District,
          state: first.State,
          district: first.District,
          block: first.Block,
          village: first.Name,
          post: first.Name,
          cities: districts,
          districts: districts,
          blocks: blocks,
          villages: villages
        });
        toast.success("Location details fetched!");
      } else {
        toast.error("Invalid Pincode");
      }
    } catch (err) {
      toast.error("Failed to fetch location");
    }
  };


  const [modalEntryType, setModalEntryType] = useState<string>('');

  // Dynamic Master Lists from entered data
  const dynamicMaster = React.useMemo(() => {
    const safeHospital = Array.isArray(hospitalEntries) ? hospitalEntries : [];
    const safeDairy = Array.isArray(dairyEntries) ? dairyEntries : [];
    const entries = [...safeHospital, ...safeDairy];
    return {
      villages: Array.from(new Set([
        ...entries.map(e => e.village).filter(Boolean)
      ])),
      posts: Array.from(new Set([
        ...postMasterList.map(p => p.name),
        ...entries.map(e => (e as any).post).filter(Boolean)
      ])),
      cities: Array.from(new Set([
        ...Object.values(UP_DISTRICTS_DATA).flatMap(d => d.cities),
        ...entries.map(e => (e as any).city).filter(Boolean)
      ])),
      blocks: Array.from(new Set([
        ...blockMasterList.map(b => b.name),
        ...Object.values(UP_DISTRICTS_DATA).flatMap(d => d.blocks),
        ...entries.map(e => e.block).filter(Boolean)
      ])),
      districts: Array.from(new Set([
        ...districtMasterList.map(d => d.name),
        ...entries.map(e => e.district).filter(Boolean)
      ])),
      states: Array.from(new Set([
        ...INDIAN_STATES,
        ...entries.map(e => (e as any).state).filter(Boolean)
      ])),
    };
  }, [hospitalEntries, dairyEntries, postMasterList, blockMasterList, districtMasterList]);

  useEffect(() => {
    if (showAddModal) {
      setModalEntryType(editingEntry?.type || (activeModule === 'Hospital' ? 'Patient' : 'Farmer'));
    }
  }, [showAddModal, editingEntry, activeModule]);

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(formData.entries()),
      ...formFiles
    };
    
    const endpoint = editingEntry 
      ? `/api/${activeModule.toLowerCase()}/entries/${editingEntry.id}`
      : (activeModule === 'Hospital' ? '/api/hospital/entries' : '/api/dairy/entries');
    
    try {
      const res = await fetch(endpoint, {
        method: editingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success(editingEntry ? "Entry updated successfully" : "Entry added successfully");
        setShowAddModal(false);
        setEditingEntry(null);
        setFormFiles({});
        setLocationData({ city: '', state: '', district: '', block: '', village: '', post: '', cities: [], districts: [], blocks: [], villages: [] });
        fetchData();
      } else {
        let errorMsg = editingEntry ? "Failed to update entry" : "Failed to add entry";
        let isConfigError = false;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
          if (res.status === 503 || errorMsg.toLowerCase().includes('not configured')) {
            isConfigError = true;
          }
          console.error('Server error data:', errData);
        } catch (e) {
          const rawText = await res.text().catch(() => "");
          errorMsg = rawText || errorMsg;
          console.error('Could not parse JSON error:', rawText);
        }

        if (isConfigError) {
          // Automatic fallback to local mode for config errors
          saveToLocalFallback(data);
          return;
        }

        toast.error(`Error: ${errorMsg}`, { duration: 6000 });
      }
    } catch (err) {
      saveToLocalFallback(data);
    }
  };

  const saveToLocalFallback = (data: any) => {
    const storageKey = activeModule === 'Hospital' ? 'local_hospital_entries' : 'local_dairy_entries';
    const localEntries = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (editingEntry) {
      const index = localEntries.findIndex((e: any) => e.id === editingEntry.id);
      if (index !== -1) {
        localEntries[index] = { ...editingEntry, ...data, updated_at: new Date().toISOString() };
      }
    } else {
      const newEntry = { 
        ...data, 
        id: Date.now(), 
        created_at: new Date().toISOString() 
      };
      localEntries.unshift(newEntry);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(localEntries));
    
    toast.success(editingEntry ? "Entry updated (Local Mode)" : "Entry saved (Local Mode)");
    setShowAddModal(false);
    setEditingEntry(null);
    setFormFiles({});
    setLocationData({ city: '', state: '', district: '', block: '', village: '', post: '', cities: [], districts: [], blocks: [], villages: [] });
    
    if (activeModule === 'Hospital') {
      setHospitalEntries(prev => editingEntry 
        ? prev.map(e => e.id === editingEntry.id ? { ...e, ...data } : e)
        : [{ ...data, id: Date.now(), _source: 'local' } as any, ...prev]
      );
    } else {
      setDairyEntries(prev => editingEntry
        ? prev.map(e => e.id === editingEntry.id ? { ...e, ...data } : e)
        : [{ ...data, id: Date.now(), _source: 'local' } as any, ...prev]
      );
    }
  };

  const handleDirectPhoneChange = (phoneVal: string) => {
    const cleanTyped = phoneVal.replace(/\D/g, "");
    if (cleanTyped.length < 5) {
      setDirectMessage(prev => ({ ...prev, phone: phoneVal }));
      setDirectMessageStatus('');
      return;
    }
    const allEntries = [...(Array.isArray(hospitalEntries) ? hospitalEntries : []), ...(Array.isArray(dairyEntries) ? dairyEntries : [])];
    
    // Find matching entry from both hospital and dairy entries
    const match = allEntries.find(e => {
      const cleanE = String(e.phone || '').replace(/\D/g, "");
      return cleanE.length >= 8 && (cleanTyped.endsWith(cleanE) || cleanE.endsWith(cleanTyped));
    });

    let detectedName = '';
    let autoTemplateId = '';
    let autoMessage = directMessage.message;
    let autoStatus = '';

    if (match) {
      detectedName = match.name || '';
      const isBday = isBirthdayToday(match.dob);
      const isAnniv = isAnniversaryToday(match.anniversary);

      if (isBday) {
        const bdayTemplate = templates.find(t => t.type === 'Birthday');
        if (bdayTemplate) {
          autoTemplateId = String(bdayTemplate.id);
          autoMessage = bdayTemplate.content.replace(/\{\{[^}]+\}\}/g, detectedName);
          autoStatus = `🎉 ${detectedName} has a birthday today! Auto-selected Birthday template.`;
          toast.success(`Birthday detected for ${detectedName}! Auto-selected template.`);
        } else {
          autoStatus = `🎉 ${detectedName} has a birthday today, but no Birthday template is configured.`;
        }
      } else if (isAnniv) {
        const annivTemplate = templates.find(t => t.type === 'Anniversary');
        if (annivTemplate) {
          autoTemplateId = String(annivTemplate.id);
          autoMessage = annivTemplate.content.replace(/\{\{[^}]+\}\}/g, detectedName);
          autoStatus = `💍 ${detectedName} has an anniversary today! Auto-selected Anniversary template.`;
          toast.success(`Anniversary detected for ${detectedName}! Auto-selected template.`);
        } else {
          autoStatus = `💍 ${detectedName} has an anniversary today, but no Anniversary template is configured.`;
        }
      } else {
        autoStatus = `👤 Record found: ${detectedName}`;
      }
    }

    setDirectMessage({
      phone: phoneVal,
      name: detectedName || directMessage.name,
      templateId: autoTemplateId || directMessage.templateId,
      message: autoMessage
    });
    setDirectMessageStatus(autoStatus);
  };

  const handleDirectNameSelection = (contact: any) => {
    const nameVal = contact.name || '';
    const phoneVal = contact.phone || '';
    const isBday = isBirthdayToday(contact.dob);
    const isAnniv = isAnniversaryToday(contact.anniversary);

    let autoTemplateId = '';
    let autoMessage = directMessage.message;
    let autoStatus = '';

    if (isBday) {
      const bdayTemplate = templates.find(t => t.type === 'Birthday');
      if (bdayTemplate) {
        autoTemplateId = String(bdayTemplate.id);
        autoMessage = bdayTemplate.content.replace(/\{\{[^}]+\}\}/g, nameVal);
        autoStatus = `🎉 ${nameVal} has a birthday today! Auto-selected Birthday template.`;
        toast.success(`Today is ${nameVal}'s Birthday! Custom greeting applied.`);
      } else {
        autoStatus = `🎉 ${nameVal} has a birthday today, but no Birthday template is configured.`;
      }
    } else if (isAnniv) {
      const annivTemplate = templates.find(t => t.type === 'Anniversary');
      if (annivTemplate) {
        autoTemplateId = String(annivTemplate.id);
        autoMessage = annivTemplate.content.replace(/\{\{[^}]+\}\}/g, nameVal);
        autoStatus = `💍 ${nameVal} has an anniversary today! Auto-selected Anniversary template.`;
        toast.success(`Today is ${nameVal}'s Anniversary! Custom celebration applied.`);
      } else {
        autoStatus = `💍 ${nameVal} has an anniversary today, but no Anniversary template is configured.`;
      }
    } else {
      autoStatus = `👤 Record found: ${nameVal}`;
    }

    setDirectMessage({
      phone: phoneVal,
      name: nameVal,
      templateId: autoTemplateId || directMessage.templateId,
      message: autoMessage
    });
    setDirectMessageStatus(autoStatus);
    setShowAppDirectNameSuggestions(false);
    setShowAppDirectPhoneSuggestions(false);
  };

  const handleDirectNameChange = (typedName: string) => {
    setDirectMessage(prev => ({ ...prev, name: typedName }));
    if (typedName.trim().length < 3) {
      setDirectMessageStatus('');
      return;
    }
    const allEntries = [...(Array.isArray(hospitalEntries) ? hospitalEntries : []), ...(Array.isArray(dairyEntries) ? dairyEntries : [])];
    const match = allEntries.find(e => String(e.name || '').toLowerCase() === typedName.trim().toLowerCase());
    if (match) {
      const isBday = isBirthdayToday(match.dob);
      const isAnniv = isAnniversaryToday(match.anniversary);
      let autoTemplateId = '';
      let autoMessage = directMessage.message;
      let autoStatus = '';

      if (isBday) {
        const bdayTemplate = templates.find(t => t.type === 'Birthday');
        if (bdayTemplate) {
          autoTemplateId = String(bdayTemplate.id);
          autoMessage = bdayTemplate.content.replace(/\{\{[^}]+\}\}/g, match.name || '');
          autoStatus = `🎉 ${match.name} has a birthday today! Auto-selected Birthday template.`;
        }
      } else if (isAnniv) {
        const annivTemplate = templates.find(t => t.type === 'Anniversary');
        if (annivTemplate) {
          autoTemplateId = String(annivTemplate.id);
          autoMessage = annivTemplate.content.replace(/\{\{[^}]+\}\}/g, match.name || '');
          autoStatus = `💍 ${match.name} has an anniversary today! Auto-selected Anniversary template.`;
        }
      } else {
        autoStatus = `👤 Record found: ${match.name}`;
      }

      setDirectMessage(prev => ({
        ...prev,
        phone: match.phone || prev.phone,
        templateId: autoTemplateId || prev.templateId,
        message: autoMessage
      }));
      setDirectMessageStatus(autoStatus);
    }
  };

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

  const sendWhatsApp = async (phone: any, message: string, name: string) => {
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const selectedMedia = mediaItems.find(m => m.id === selectedMediaId);

    if (selectedMedia) {
      try {
        await navigator.clipboard.writeText(message);
        toast.success("Message copied to clipboard!");
      } catch (err) {
        // Fallback
      }
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (selectedMedia) {
      // Open the beautiful attachment guide overlay in App.tsx!
      setAttachmentGuide({
        phone: cleanPhone,
        name: name,
        message: message,
        media: selectedMedia
      });
    } else {
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setBlockedPopupUrl(url);
        setBlockedPopupName(name);
      }
    }
    
    // Log the message
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: activeModule,
        recipient_name: name,
        recipient_phone: phone,
        message,
        status: 'Sent',
        action_type: selectedMedia ? 'Share' : 'Send',
        media_name: selectedMedia?.name || null
      })
    });
    fetchData();
  };

  const handleShareEntry = (entry: any) => {
    const text = `*Entry Details*\nName: ${entry.name}\nPhone: ${entry.phone}\nLocation: ${entry.village}, ${entry.block}\nModule: ${activeModule}`;
    sendWhatsApp(entry.phone, text, entry.name);
  };

  const handleLaunchBulkGreetings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCampaignTemplate.trim()) {
      toast.error("Please enter a message template.");
      return;
    }

    const selectedEntries = (activeModule === 'Hospital' ? hospitalEntries : dairyEntries).filter(
      entry => selectedEntryIds.includes(entry.id)
    );

    if (selectedEntries.length === 0) {
      toast.error("No contacts selected.");
      return;
    }

    const contacts = selectedEntries.map(entry => ({
      name: entry.name,
      phone: entry.phone
    }));

    const selectedMedia = mediaItems.find(m => m.id === bulkCampaignMediaId);

    try {
      const payload = {
        name: bulkCampaignName || `Group Greetings - ${activeModule}`,
        account_id: campaignAccount || 1,
        message: bulkCampaignTemplate,
        contacts,
        delay_seconds: Number(bulkCampaignDelay),
        media: selectedMedia ? {
          name: selectedMedia.name,
          type: selectedMedia.type,
          data: selectedMedia.data,
          url: selectedMedia.data
        } : null
      };

      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Group greetings successfully scheduled! Track dispatch progress inside 'Advanced CRM' tab.", { duration: 5000, icon: '🚀' });
        setSelectedEntryIds([]);
        setShowBulkGreetingsModal(false);
        setBulkCampaignTemplate('');
        setBulkCampaignMediaId(null);
      } else {
        toast.error("Failed to schedule greetings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error triggering bulk send.");
    }
  };

  const handleSendBulkCampaign = async () => {
    if (!bulkCustomMessage.trim()) {
      toast.error("Please enter a custom message or select a template.");
      return;
    }

    // Determine target entries based on active module and target filters
    let targetEntries = activeModule === 'Hospital' ? hospitalEntries : dairyEntries;
    
    if (bulkSendTarget === 'dept') {
      targetEntries = targetEntries.filter((eAny: any) => {
        const e = eAny as HospitalEntry;
        return e.department && e.department.toLowerCase() === bulkSendSelectedSubValue.toLowerCase();
      });
    } else if (bulkSendTarget === 'village') {
      targetEntries = targetEntries.filter((eAny: any) => {
        return eAny.village && eAny.village.toLowerCase() === bulkSendSelectedSubValue.toLowerCase();
      });
    }

    // Filter out entries without phone
    const validEntries = targetEntries.filter(e => e.phone && e.phone.trim().length > 0);

    if (validEntries.length === 0) {
      toast.error(`No contacts found with valid phone numbers for target: ${bulkSendTarget === 'all' ? 'All' : bulkSendSelectedSubValue}`);
      return;
    }

    const contacts = validEntries.map(entry => ({
      name: entry.name,
      phone: entry.phone
    }));

    const selectedMedia = mediaItems.find(m => m.id === selectedMediaId);

    try {
      const payload = {
        name: `Campaign - ${activeModule} - ${bulkSendTarget === 'all' ? 'All' : bulkSendSelectedSubValue} (${new Date().toLocaleDateString()})`,
        account_id: 1, // Default account, same as other campaign/greetings launch
        message: bulkCustomMessage,
        contacts,
        delay_seconds: 5,
        media: selectedMedia ? {
          name: selectedMedia.name,
          type: selectedMedia.type,
          data: selectedMedia.data,
          url: selectedMedia.data
        } : null
      };

      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Group campaign successfully scheduled! Sending to ${contacts.length} recipients...`, { duration: 5000, icon: '🚀' });
        // Clear fields
        setBulkSelectedTemplateId('');
        setBulkCustomMessage('');
        setSelectedMediaId(null);
      } else {
        toast.error("Failed to schedule bulk campaign.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error triggering bulk send.");
    }
  };

  const exportData = (data: any[], filename: string) => {
    if (data.length === 0) return toast.error("No data to export");
    
    // Define fields to exclude (mostly binary/blobs)
    const excludeFields = ['photo', 'id_card', 'aadhaar_card', 'data'];
    
    const headers = Object.keys(data[0]).filter(key => !excludeFields.includes(key));
    
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = (data: any[], filename: string) => {
    if (data.length === 0) return toast.error("No data to export");
    
    // Define fields to exclude (mostly binary/blobs)
    const excludeFields = ['photo', 'id_card', 'aadhaar_card', 'data'];
    const headers = Object.keys(data[0]).filter(key => !excludeFields.includes(key));
    
    const rows = data.map(row => 
      headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      })
    );

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape fits wider tables better
      
      // Add a clean title
      doc.setFontSize(14);
      doc.text(filename.replace(/_/g, ' '), 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated at: ${new Date().toLocaleString()}`, 14, 21);

      autoTable(doc, {
        startY: 25,
        head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' '))],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [24, 24, 27] }, // zinc-900 style
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });

      doc.save(`${filename}.pdf`);
      toast.success(`${filename.replace(/_/g, ' ')} downloaded as PDF successfully!`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Check log elements.");
    }
  };

  const filteredEntries = (Array.isArray(activeModule === 'Hospital' ? hospitalEntries : dairyEntries) ? (activeModule === 'Hospital' ? hospitalEntries : dairyEntries) : []).filter(e => 
    String(e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(e.phone || '').includes(searchTerm) ||
    String((activeModule === 'Hospital' ? (e as HospitalEntry).village : (e as DairyEntry).village) || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReportEntries = (Array.isArray(activeModule === 'Hospital' ? hospitalEntries : dairyEntries) ? (activeModule === 'Hospital' ? hospitalEntries : dairyEntries) : []).filter(e => {
    const s = reportFilters;
    const name = String(e.name || '').trim().toLowerCase();
    const phone = String(e.phone || '').trim();
    const village = String(e.village || '').trim().toLowerCase();
    
    const searchVal = String(s.search || '').trim().toLowerCase();
    const villageVal = String(s.village || '').trim().toLowerCase();
    const postVal = String(s.post || '').trim().toLowerCase();
    const stateVal = String(s.state || '').trim().toLowerCase();
    const districtVal = String(s.district || '').trim().toLowerCase();
    const blockVal = String(s.block || '').trim().toLowerCase();
    const pincodeVal = String(s.pincode || '').trim();

    const matchesSearch = !searchVal || 
      name.includes(searchVal) || 
      phone.includes(searchVal);
    
    const matchesVillage = !villageVal || village.includes(villageVal);
    const matchesPost = !postVal || String((e as HospitalEntry).post || '').trim().toLowerCase().includes(postVal);
    const matchesState = !stateVal || String(e.state || '').trim().toLowerCase().includes(stateVal);
    const matchesDistrict = !districtVal || String(e.district || '').trim().toLowerCase().includes(districtVal);
    const matchesBlock = !blockVal || String(e.block || '').trim().toLowerCase().includes(blockVal);
    const matchesPincode = !pincodeVal || String(e.pincode || '').trim().includes(pincodeVal);
    
    return matchesSearch && matchesVillage && matchesPost && matchesState && matchesDistrict && matchesBlock && matchesPincode;
  });

  const ageGroupDistribution = React.useMemo(() => {
    const entries = filteredReportEntries;
    const groups = [
      { name: '0-18', count: 0 },
      { name: '19-35', count: 0 },
      { name: '36-50', count: 0 },
      { name: '50+', count: 0 },
    ];
    entries.forEach(e => {
      if (!e.dob) return;
      try {
        const birthDate = parseISO(e.dob);
        const age = differenceInYears(new Date(), birthDate);
        if (age <= 18) groups[0].count++;
        else if (age <= 35) groups[1].count++;
        else if (age <= 50) groups[2].count++;
        else groups[3].count++;
      } catch (err) {
        // Skip invalid dates
      }
    });
    return groups;
  }, [filteredReportEntries]);

  const locationDistribution = React.useMemo(() => {
    const entries = filteredReportEntries;
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      const v = e.village || 'Unknown';
      counts[v] = (counts[v] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top4 = sorted.slice(0, 4).map(([name, value]) => ({ name, value }));
    const othersCount = sorted.slice(4).reduce((acc, curr) => acc + curr[1], 0);
    if (othersCount > 0) {
      top4.push({ name: 'Others', value: othersCount });
    }
    return top4.length > 0 ? top4 : [{ name: 'No Data', value: 1 }];
  }, [filteredReportEntries]);

  const isBirthdayToday = (dob?: string) => {
    if (!dob || dob.length < 5) return false;
    try {
      const d = parseISO(dob);
      return isValid(d) && format(d, 'MM-dd') === format(new Date(), 'MM-dd');
    } catch (e) {
      return false;
    }
  };

  const isAnniversaryToday = (anniversary?: string) => {
    if (!anniversary || anniversary.length < 5) return false;
    try {
      const d = parseISO(anniversary);
      return isValid(d) && format(d, 'MM-dd') === format(new Date(), 'MM-dd');
    } catch (e) {
      return false;
    }
  };

  const getBirthdayBoys = () => {
    try {
      const today = format(new Date(), 'MM-dd');
      return filteredEntries.filter(e => {
        if (!e.dob || e.dob.length < 5) return false;
        try {
          const date = parseISO(e.dob);
          return format(date, 'MM-dd') === today;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  };

  const getAnniversaryFolks = () => {
    try {
      const today = format(new Date(), 'MM-dd');
      return filteredEntries.filter(e => {
        if (!e.anniversary || e.anniversary.length < 5) return false;
        try {
          const date = parseISO(e.anniversary);
          return format(date, 'MM-dd') === today;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 border border-zinc-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Admin Panel</h1>
            <p className="text-zinc-500">Please sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input label="Username" name="username" placeholder="Enter username" required />
            <Input label="Password" name="password" type="password" placeholder="Enter password" required />
            <Button type="submit" className="w-full py-4">Sign In</Button>
          </form>

          {/* Real-time Connection Diagnostics Widget */}
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <details className="group">
              <summary className="flex items-center justify-between text-xs text-zinc-500 font-semibold cursor-pointer hover:text-zinc-800 transition-colors select-none">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    dbStatus.apiStatus === 'online' ? 'bg-emerald-500' :
                    dbStatus.apiStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                  }`} />
                  System & DB Diagnostics
                </span>
                <span className="text-zinc-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              
              <div className="mt-4 space-y-3 text-xs text-zinc-600 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                {/* 1. API Status */}
                <div className="flex justify-between items-center">
                  <span>API Connection:</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    dbStatus.apiStatus === 'online' ? 'bg-emerald-100 text-emerald-800' :
                    dbStatus.apiStatus === 'offline' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {dbStatus.apiStatus === 'checking' && "Checking..."}
                    {dbStatus.apiStatus === 'online' && "Online"}
                    {dbStatus.apiStatus === 'offline' && "Offline"}
                  </span>
                </div>

                {/* 2. Routing Mode */}
                <div className="flex justify-between items-center">
                  <span>Routing Engine:</span>
                  <span className="font-medium text-zinc-700">
                    {dbStatus.usingVpsRedirect ? (
                      <span className="text-indigo-600 font-semibold" title={dbStatus.vpsUrlUsed}>
                        VPS Redirect ({dbStatus.vpsUrlUsed.replace(/^https?:\/\//, '')})
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-semibold">Vercel Serverless</span>
                    )}
                  </span>
                </div>

                {/* 3. Supabase Integration Config */}
                <div className="flex justify-between items-center">
                  <span>Supabase Configured:</span>
                  <span className={`font-semibold ${dbStatus.supabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {dbStatus.supabaseConfigured === null ? "..." : (dbStatus.supabaseConfigured ? "Yes" : "No (In-Memory Fallback)")}
                  </span>
                </div>

                {/* 4. Database Reachability check */}
                {dbStatus.supabaseConfigured && (
                  <div className="flex justify-between items-center">
                    <span>Database Reachable:</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      dbStatus.supabaseReachable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {dbStatus.supabaseReachable === null ? "..." : (dbStatus.supabaseReachable ? "Connected" : "Failed / Blocked")}
                    </span>
                  </div>
                )}

                {/* 5. Detailed Console Output */}
                {dbStatus.errorDetails && (
                  <div className="mt-2 text-[11px] bg-zinc-900 text-zinc-300 font-mono p-2.5 rounded-xl overflow-x-auto max-h-24 whitespace-pre-wrap border border-zinc-800">
                    <span className="text-zinc-500 font-bold">INFO/ERR DETAIL:</span> {dbStatus.errorDetails}
                  </div>
                )}
              </div>
            </details>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-100 text-center space-y-2">
            <p className="text-xs text-zinc-500 font-bold">
              Developed by Digital Communique Private limited
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
            {activeModule === 'Hospital' ? <Hospital size={24} /> : <Milk size={24} />}
          </div>
          <div>
            <h1 className="font-bold text-zinc-900 leading-tight">Shri Krishna</h1>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              {activeModule === 'Hospital' ? 'Mission Hospital' : 'Sugar & Dairy'}
            </p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 mt-4">Main Menu</p>
        {user.role === 'admin' && (
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Global Overview" 
            active={activeTab === 'global'} 
            onClick={() => { setActiveTab('global'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={activeModule === 'Hospital' ? Hospital : Milk} 
            label="Module Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Users} 
            label="Staff" 
            active={activeTab === 'staff'} 
            onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={PlusCircle} 
            label="Data Entry" 
            active={activeTab === 'data'} 
            onClick={() => { setActiveTab('data'); setIsSidebarOpen(false); }} 
          />
        )}
        <SidebarItem 
          icon={MessageSquare} 
          label="Automation" 
          active={activeTab === 'automation'} 
          onClick={() => { setActiveTab('automation'); setIsSidebarOpen(false); }} 
        />
        <SidebarItem 
          icon={Smartphone} 
          label="WhatsApp CRM" 
          active={activeTab === 'whatsapp-crm'} 
          onClick={() => { setActiveTab('whatsapp-crm'); setIsSidebarOpen(false); }} 
        />
        {user.role === 'admin' && (
          <SidebarItem 
            icon={BarChart3} 
            label="Reports" 
            active={activeTab === 'reports'} 
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={FileBarChart} 
            label="User Reports" 
            active={activeTab === 'user-reports'} 
            onClick={() => { setActiveTab('user-reports'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Globe} 
            label="State" 
            active={activeTab === 'states'} 
            onClick={() => { setActiveTab('states'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={MapPin} 
            label="District" 
            active={activeTab === 'districts'} 
            onClick={() => { setActiveTab('districts'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Box} 
            label="Block" 
            active={activeTab === 'blocks'} 
            onClick={() => { setActiveTab('blocks'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Mail} 
            label="Post" 
            active={activeTab === 'posts'} 
            onClick={() => { setActiveTab('posts'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Upload} 
            label="Upload Data" 
            active={activeTab === 'upload-data'} 
            onClick={() => { setActiveTab('upload-data'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Download} 
            label="Export Data" 
            active={activeTab === 'export-data'} 
            onClick={() => { setActiveTab('export-data'); setIsSidebarOpen(false); }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={RotateCcw} 
            label="Switch Module" 
            onClick={() => {
              const nextModule = activeModule === 'Hospital' ? 'Dairy' : 'Hospital';
              setActiveModule(nextModule);
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
              toast.success(`Switched to ${nextModule} Module`);
            }} 
          />
        )}
        {user.role === 'admin' && (
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
          />
        )}
        <SidebarItem 
          icon={FileText} 
          label="User Manual" 
          active={activeTab === 'manual'} 
          onClick={() => { setActiveTab('manual'); setIsSidebarOpen(false); }} 
        />
        <SidebarItem icon={LogOut} label="Logout" onClick={() => setUser(null)} />
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden relative">
      <Toaster position="top-right" />

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
      
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-200 flex-col p-6 space-y-8 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 flex flex-col space-y-8 shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 line-clamp-1">
                {activeTab === 'global' && 'Global Overview'}
                {activeTab === 'dashboard' && `${activeModule} Overview`}
                {activeTab === 'staff' && 'Staff Management'}
                {activeTab === 'data' && 'Data Management'}
                {activeTab === 'automation' && 'Messaging Automation'}
                {activeTab === 'whatsapp-crm' && 'Advanced WhatsApp CRM'}
                {activeTab === 'reports' && 'Analytical Reports'}
                {activeTab === 'user-reports' && 'User Specific Reports'}
                {activeTab === 'districts' && 'District Wise Statistics'}
                {activeTab === 'states' && 'State Wise Statistics'}
                {activeTab === 'blocks' && 'Block Wise Statistics'}
                {activeTab === 'posts' && 'Post Office Wise Statistics'}
                {activeTab === 'upload-data' && 'Import Data'}
                {activeTab === 'export-data' && 'Export Data Hub'}
                {activeTab === 'manual' && 'User Manual & Guides'}
              </h2>
              <p className="text-sm text-zinc-500">Welcome back, {user.username}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {user.role === 'admin' && (
              <Button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2">
                <PlusCircle size={18} />
                Add New
              </Button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'global' && (
            <motion.div 
              key="global"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-zinc-500 text-sm font-medium">Hospital Patients</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{hospitalCount !== null ? hospitalCount : hospitalEntries.length}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Total Registered</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-emerald-500">
                  <h3 className="text-zinc-500 text-sm font-medium">Dairy Members</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{dairyCount !== null ? dairyCount : dairyEntries.length}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">Farmers & Customers</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-purple-500">
                  <h3 className="text-zinc-500 text-sm font-medium">Total Messages</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{logs.length}</p>
                  <p className="text-xs text-purple-600 mt-2 font-medium">Across All Modules</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-orange-500">
                  <h3 className="text-zinc-500 text-sm font-medium">Today's Events</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">
                    {hospitalEntries.filter(e => {
                      try {
                        return e.dob && isValid(parseISO(e.dob)) && format(parseISO(e.dob), 'MM-dd') === format(new Date(), 'MM-dd');
                      } catch (err) { return false; }
                    }).length + 
                     dairyEntries.filter(e => {
                      try {
                        return e.dob && isValid(parseISO(e.dob)) && format(parseISO(e.dob), 'MM-dd') === format(new Date(), 'MM-dd');
                      } catch (err) { return false; }
                    }).length}
                  </p>
                  <p className="text-xs text-orange-600 mt-2 font-medium">Birthdays & Anniversaries</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-zinc-900 mb-6">Combined Growth Analysis</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={[
                        { name: 'Hospital', count: hospitalCount !== null ? hospitalCount : hospitalEntries.length, fill: '#3b82f6' },
                        { name: 'Dairy', count: dairyCount !== null ? dairyCount : dairyEntries.length, fill: '#10b981' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-zinc-900 mb-6">Recent Activity Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                          <Hospital size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">Hospital Module</p>
                          <p className="text-xs text-zinc-500">{hospitalCount !== null ? hospitalCount : hospitalEntries.length} Patients Active</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => { setActiveModule('Hospital'); setActiveTab('dashboard'); }}>View</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                          <Milk size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">Dairy Module</p>
                          <p className="text-xs text-zinc-500">{dairyCount !== null ? dairyCount : dairyEntries.length} Members Active</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => { setActiveModule('Dairy'); setActiveTab('dashboard'); }}>View</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Users size={24} />
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+12%</span>
                  </div>
                  <h3 className="text-zinc-500 text-sm font-medium">Total {activeModule === 'Hospital' ? 'Patients' : 'Farmers'}</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">
                    {searchTerm 
                      ? filteredEntries.length 
                      : (activeModule === 'Hospital'
                        ? (hospitalCount !== null ? hospitalCount : hospitalEntries.length)
                        : (dairyCount !== null ? dairyCount : dairyEntries.length))
                    }
                  </p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                  </div>
                  <h3 className="text-zinc-500 text-sm font-medium">Birthdays Today</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{getBirthdayBoys().length}</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                      <MessageSquare size={24} />
                    </div>
                  </div>
                  <h3 className="text-zinc-500 text-sm font-medium">Messages Sent</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{logs.length}</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                      <BarChart3 size={24} />
                    </div>
                  </div>
                  <h3 className="text-zinc-500 text-sm font-medium">Growth Rate</h3>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">8.4%</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <h3 className="font-bold text-zinc-900 mb-6">Registration Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={[
                        { name: 'Mon', count: 4 },
                        { name: 'Tue', count: 7 },
                        { name: 'Wed', count: 5 },
                        { name: 'Thu', count: 12 },
                        { name: 'Fri', count: 9 },
                        { name: 'Sat', count: 15 },
                        { name: 'Sun', count: 6 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-zinc-900 mb-6">Today's Reminders</h3>
                  <div className="space-y-4">
                    {getBirthdayBoys().length === 0 && getAnniversaryFolks().length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="mx-auto text-zinc-200 mb-3" size={48} />
                        <p className="text-zinc-400 text-sm">No events for today</p>
                      </div>
                    ) : (
                      <>
                        {getBirthdayBoys().map(person => (
                          <div key={person.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-zinc-200 text-lg">🎂</div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{person.name}</p>
                                <p className="text-xs text-zinc-500">Birthday</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setShowTemplatePicker({ phone: person.phone, name: person.name, type: 'Birthday' })}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Send size={18} />
                            </button>
                          </div>
                        ))}
                        {getAnniversaryFolks().map(person => (
                          <div key={person.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-zinc-200 text-lg">💍</div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{person.name}</p>
                                <p className="text-xs text-zinc-500">Anniversary</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setShowTemplatePicker({ phone: person.phone, name: person.name, type: 'Anniversary' })}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Send size={18} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold text-zinc-900">All Entries</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportData(filteredEntries, `${activeModule}_Entries`)}>
                      <Download size={16} />
                      Export CSV
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportPDF(filteredEntries, `${activeModule}_Entries`)}>
                      <FileBarChart size={16} />
                      Export PDF
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-2">
                      <Filter size={16} />
                      Filter
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50" 
                      onClick={handleClearAllData}
                    >
                      <Trash2 size={16} />
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-left whitespace-nowrap w-4">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                            checked={filteredEntries.length > 0 && selectedEntryIds.length === filteredEntries.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEntryIds(filteredEntries.map(e => e.id));
                              } else {
                                setSelectedEntryIds([]);
                              }
                            }}
                          />
                        </th>
                        {activeModule === 'Hospital' ? (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">ID</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Father / Husband</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">DOB</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Anniversary</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Age</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Village</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Block</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Department</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">District</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Post</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Pincode</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Location</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Age</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">BMC/DPMC</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredEntries.map((entry: any) => {
                        const isDuplicate = phoneCount[entry.phone] > 1;
                        const isRowSelected = selectedEntryIds.includes(entry.id);
                        return (
                        <tr key={entry.id} className={`hover:bg-zinc-50/50 transition-all group ${isDuplicate ? 'bg-amber-50/30' : ''} ${isRowSelected ? 'bg-zinc-50/70' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap w-4">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                              checked={isRowSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEntryIds(prev => [...prev, entry.id]);
                                } else {
                                  setSelectedEntryIds(prev => prev.filter(id => id !== entry.id));
                                }
                              }}
                            />
                          </td>
                          {activeModule === 'Hospital' ? (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-zinc-900 border-l-2 border-transparent group-hover:border-zinc-900">
                                <div className="flex items-center gap-2">
                                  #{entry.id}
                                  {(entry as any)._source === 'fallback' && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-md font-bold uppercase">Fallback</span>
                                  )}
                                  {isDuplicate && <span title="Duplicate entry detected" className="text-amber-500"><AlertTriangle size={12} /></span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {entry.photo && <img src={entry.photo} className="w-8 h-8 rounded-full object-cover" alt="" />}
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-900 flex items-center gap-2 flex-wrap">
                                      <span>{entry.name}</span>
                                      {isBirthdayToday(entry.dob) && (
                                        <button
                                          onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Birthday' })}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full transition-all shadow-sm cursor-pointer ml-1 animate-pulse"
                                          title="Today is Birthday! Click to send WhatsApp Greetings"
                                        >
                                          <Cake size={10} className="stroke-[3]" />
                                          <span>HBD 💬</span>
                                        </button>
                                      )}
                                      {isAnniversaryToday(entry.anniversary) && (
                                        <button
                                          onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Anniversary' })}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-full transition-all shadow-sm cursor-pointer ml-1 animate-pulse"
                                          title="Today is Anniversary! Click to send WhatsApp Greetings"
                                        >
                                          <span>💝</span>
                                          <span>Anniversary 💬</span>
                                        </button>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.father_husband}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 font-mono tabular-nums">{entry.phone}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">
                                {entry.dob}
                                {entry.dob && (() => {
                                  try {
                                    const d = parseISO(entry.dob);
                                    return isValid(d) && format(d, 'MM-dd') === format(new Date(), 'MM-dd');
                                  } catch (e) { return false; }
                                })() && (
                                  <button 
                                    onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Birthday' })}
                                    className="ml-2 p-1 text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-all inline-flex items-center justify-center"
                                    title="Send Birthday Wish"
                                  >
                                    <Send size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600">
                                {entry.anniversary}
                                {entry.anniversary && (() => {
                                  try {
                                    const d = parseISO(entry.anniversary);
                                    return isValid(d) && format(d, 'MM-dd') === format(new Date(), 'MM-dd');
                                  } catch (e) { return false; }
                                })() && (
                                  <button 
                                    onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Anniversary' })}
                                    className="ml-2 p-1 text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-all inline-flex items-center justify-center"
                                    title="Send Anniversary Wish"
                                  >
                                    <Send size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.age}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.village}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.block}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.department}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.district}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.post}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.pincode}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.doctor}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {entry.photo ? (
                                    <img src={entry.photo} className="w-10 h-10 rounded-full object-cover border border-zinc-100 shadow-sm" alt="" />
                                  ) : (
                                    <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100">
                                      <Users size={20} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900 flex flex-wrap items-center gap-2">
                                      <span>{entry.name}</span>
                                      {isBirthdayToday(entry.dob) && (
                                        <button
                                          onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Birthday' })}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full transition-all shadow-sm cursor-pointer animate-pulse"
                                          title="Today is Birthday! Click to send WhatsApp Greetings"
                                        >
                                          <Cake size={10} className="stroke-[3]" />
                                          <span>HBD 💬</span>
                                        </button>
                                      )}
                                      {isAnniversaryToday(entry.anniversary) && (
                                        <button
                                          onClick={() => setShowTemplatePicker({ phone: entry.phone, name: entry.name, type: 'Anniversary' })}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-full transition-all shadow-sm cursor-pointer animate-pulse"
                                          title="Today is Anniversary! Click to send WhatsApp Greetings"
                                        >
                                          <span>💝</span>
                                          <span>Anniversary 💬</span>
                                        </button>
                                      )}
                                      {(entry as any)._source === 'fallback' && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-md font-bold uppercase">Fallback</span>
                                      )}
                                      {isDuplicate && <span title="Duplicate entry detected" className="text-amber-500"><AlertTriangle size={12} /></span>}
                                      {(entry.id_card || entry.aadhaar_card) && (
                                        <span title={entry.id_card ? "ID Card Available" : "Aadhaar Card Available"} className="text-blue-500">
                                          <ShieldCheck size={12} />
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 font-mono tracking-tighter">ID: #{entry.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{entry.phone}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.village}, {entry.block}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.age}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  entry.type === 'Farmer' ? "bg-emerald-50 text-emerald-600" : 
                                  entry.type === 'Staff' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                                )}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{entry.bmc_dpmc}</td>
                            </>
                          )}
                          <td className="px-6 py-4 sticky right-0 bg-white shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.1)] md:static md:shadow-none min-w-[140px] z-10">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => sendWhatsApp(entry.phone, `Hello ${entry.name},`, entry.name)}
                                className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                title="WhatsApp"
                              >
                                <MessageSquare size={16} />
                              </button>
                              <button 
                                onClick={() => handleShareEntry(entry)}
                                className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                title="Share"
                              >
                                <Share size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setFormFiles({
                                    photo: entry.photo,
                                    id_card: entry.id_card,
                                    aadhaar_card: entry.aadhaar_card
                                  });
                                  setLocationData({
                                    city: entry.city || '',
                                    state: entry.state || '',
                                    district: entry.district || '',
                                    block: entry.block || '',
                                    village: entry.village || '',
                                    post: entry.post || '',
                                    cities: [],
                                    districts: [],
                                    blocks: [],
                                    villages: []
                                  });
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* FLOATING ACTION BAR FOR SELECTED RECIPIENTS */}
              <AnimatePresence>
                {selectedEntryIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md bg-opacity-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-sm font-medium tracking-tight">
                        <strong className="text-emerald-400 font-extrabold">{selectedEntryIds.length}</strong> contacts selected
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedEntryIds([])}
                        className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                      >
                        Deselect All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkCampaignName(`Group Wishes - ${new Date().toLocaleDateString()}`);
                          setShowBulkGreetingsModal(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>Send Greetings / Wishes</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'automation' && (
            <motion.div 
              key="automation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Today's Automation Reminders */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                       <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                         <Calendar size={18} />
                       </div>
                       Today's Birthdays
                    </h3>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      {getBirthdayBoys().length} Events
                    </span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {getBirthdayBoys().length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-8">No birthdays today</p>
                    ) : (
                      getBirthdayBoys().map(person => (
                        <div key={person.id} className="flex items-center justify-between p-3 bg-white border border-zinc-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-lg">🎂</div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{person.name}</p>
                              <p className="text-[10px] text-zinc-500">{person.phone}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => setShowTemplatePicker({ phone: person.phone, name: person.name, type: 'Birthday' })}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Send size={14} className="mr-2" />
                            Wish
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50/50 to-white border-purple-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                       <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                         <Heart size={18} />
                       </div>
                       Today's Anniversaries
                    </h3>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      {getAnniversaryFolks().length} Events
                    </span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {getAnniversaryFolks().length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-8">No anniversaries today</p>
                    ) : (
                      getAnniversaryFolks().map(person => (
                        <div key={person.id} className="flex items-center justify-between p-3 bg-white border border-zinc-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-lg">💍</div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{person.name}</p>
                              <p className="text-[10px] text-zinc-500">{person.phone}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => setShowTemplatePicker({ phone: person.phone, name: person.name, type: 'Anniversary' })}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Send size={14} className="mr-2" />
                            Wish
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Message Templates</h3>
                <div className="space-y-4">
                  {templates.map(template => (
                    <div key={template.id} className="p-4 border border-zinc-100 rounded-xl hover:border-zinc-200 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{template.type}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingTemplate(template); setShowAddTemplateModal(true); }}
                            className="text-zinc-400 hover:text-zinc-900"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-zinc-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-zinc-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-zinc-500 line-clamp-2">{template.content}</p>
                    </div>
                  ))}
                  <Button 
                    onClick={() => { setEditingTemplate(null); setShowAddTemplateModal(true); }}
                    variant="secondary" 
                    className="w-full border-dashed border-2 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300"
                  >
                    + Create New Template
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Direct Messenger</h3>
                <div className="space-y-4">
                  {/* Recipient Phone field with relative suggestions */}
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-medium text-zinc-700">Recipient Phone</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono"
                      placeholder="919876543210" 
                      value={directMessage.phone}
                      onChange={(e) => {
                        handleDirectPhoneChange(e.target.value);
                        setShowAppDirectPhoneSuggestions(true);
                      }}
                      onFocus={() => setShowAppDirectPhoneSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowAppDirectPhoneSuggestions(false), 200)}
                      required
                    />
                    
                    {showAppDirectPhoneSuggestions && (
                      <div className="absolute left-0 right-0 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto divide-y divide-zinc-100">
                        {(() => {
                          const query = (directMessage.phone || "").replace(/\D/g, "");
                          const filtered = [
                            ...(hospitalEntries || []).map(e => ({ ...e, _sourceType: "Patient" })),
                            ...(dairyEntries || []).map(e => ({ ...e, _sourceType: "Farmer/Customer" }))
                          ].filter(e => {
                            if (!query) return isBirthdayToday(e.dob) || isAnniversaryToday(e.anniversary);
                            return String(e.phone || "").replace(/\D/g, "").includes(query);
                          }).slice(0, 5);
                          
                          if (filtered.length === 0) {
                            return <div className="p-3 text-xs text-zinc-500 text-center">No matching records found</div>;
                          }
                          
                          return filtered.map((item, idx) => {
                            const isBday = isBirthdayToday(item.dob);
                            const isAnniv = isAnniversaryToday(item.anniversary);
                            return (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between text-xs transition-colors"
                                onClick={() => handleDirectNameSelection(item)}
                              >
                                <div>
                                  <span className="font-bold text-zinc-800">{item.name}</span>
                                  <span className="text-zinc-500 font-mono ml-2">({item.phone})</span>
                                  {isBday && <span className="ml-1.5 text-[10px] text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full font-bold">🎂 Bday</span>}
                                  {isAnniv && <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-bold">💍 Anniv</span>}
                                </div>
                                <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-[6px] font-semibold text-[9px] uppercase tracking-wider">{item._sourceType}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Recipient Name field with relative suggestions */}
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-medium text-zinc-700">Recipient Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-sans"
                      placeholder="Enter name (auto-filled on match or select)..." 
                      value={directMessage.name}
                      onChange={(e) => {
                        handleDirectNameChange(e.target.value);
                        setShowAppDirectNameSuggestions(true);
                      }}
                      onFocus={() => setShowAppDirectNameSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowAppDirectNameSuggestions(false), 200)}
                      required
                    />

                    {showAppDirectNameSuggestions && (
                      <div className="absolute left-0 right-0 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto divide-y divide-zinc-100">
                        {(() => {
                          const query = (directMessage.name || "").toLowerCase();
                          const allContacts = [
                            ...(hospitalEntries || []).map(e => ({ ...e, _sourceType: "Patient" })),
                            ...(dairyEntries || []).map(e => ({ ...e, _sourceType: "Farmer/Customer" }))
                          ];
                          
                          // Prioritize birthday/anniversary today
                          const priorityContacts = allContacts.filter(e => isBirthdayToday(e.dob) || isAnniversaryToday(e.anniversary));
                          
                          let filtered = [];
                          if (query.trim().length > 0) {
                            filtered = allContacts.filter(e => String(e.name || "").toLowerCase().includes(query)).slice(0, 6);
                          } else {
                            filtered = priorityContacts.slice(0, 6);
                          }
                          
                          if (filtered.length === 0) {
                            if (query.trim().length === 0) {
                              return <div className="p-3 text-xs text-zinc-400 text-center italic">Type to search patients & farmers...</div>;
                            }
                            return <div className="p-3 text-xs text-zinc-500 text-center">No matching database records</div>;
                          }
                          
                          return (
                            <>
                              {query.trim().length === 0 && priorityContacts.length > 0 && (
                                <div className="bg-emerald-50/50 px-4 py-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                                  🎉 Celebrating Today
                                </div>
                              )}
                              {filtered.map((item, idx) => {
                                const isBday = isBirthdayToday(item.dob);
                                const isAnniv = isAnniversaryToday(item.anniversary);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between text-xs transition-colors"
                                    onClick={() => handleDirectNameSelection(item)}
                                  >
                                    <div>
                                      <span className="font-bold text-zinc-800">{item.name}</span>
                                      <span className="text-zinc-500 font-mono ml-2">({item.phone})</span>
                                      {isBday && <span className="ml-1.5 text-[10px] text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full font-bold">🎂 Birthday today</span>}
                                      {isAnniv && <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-bold">💍 Anniversary today</span>}
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-[6px] font-semibold text-[9px] uppercase tracking-wider">{item._sourceType}</span>
                                  </button>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {directMessageStatus && (
                    <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 animate-fade-in flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {directMessageStatus}
                    </div>
                  )}

                  <Select 
                    label="Select Template" 
                    value={directMessage.templateId}
                    onChange={(e) => {
                      const t = templates.find(temp => temp.id === parseInt(e.target.value));
                      const placeholderName = directMessage.name || 'Valued Customer';
                      setDirectMessage({ 
                        ...directMessage, 
                        templateId: e.target.value,
                        message: t ? t.content.replace(/\{\{[^}]+\}\}/g, placeholderName) : directMessage.message
                      });
                    }}
                    options={[{ value: '', label: 'None' }, ...templates.map(t => ({ value: t.id, label: t.name }))]} 
                    required
                  />

                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Attach Media</p>
                    <div className="flex flex-wrap gap-2">
                      {mediaItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedMediaId(selectedMediaId === item.id ? null : item.id)}
                          className={cn(
                            "relative w-12 h-12 bg-white border rounded-lg overflow-hidden cursor-pointer transition-all group",
                            selectedMediaId === item.id ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                          )}
                        >
                          {item.type.startsWith('image') ? (
                            <img src={item.data} className="w-full h-full object-cover" alt="" />
                          ) : item.type.startsWith('video') ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                              <Video size={16} />
                            </div>
                          ) : item.type.includes('pdf') ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-red-400">
                              <FileText size={16} />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                              <BarChart3 size={16} />
                            </div>
                          )}
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteMedia(item.id, e)}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white transition-opacity shadow-sm rounded-bl-lg"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label className="w-12 h-12 bg-white border border-zinc-200 border-dashed rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-900 cursor-pointer transition-all">
                        <PlusCircle size={16} />
                        <input type="file" className="hidden" accept="image/*,video/*,.gif,application/pdf" onChange={handleMediaUpload} />
                      </label>
                    </div>
                    {selectedMediaId && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                          <span className="font-bold uppercase tracking-tight text-[10px] block mb-1">How to send media:</span>
                          1. Click "Send" or "Share" <br/>
                          2. WhatsApp will open (Message is already copied). <br/>
                          3. Attach the file manually and PASTE the caption.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-700">Message</label>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(directMessage.message);
                          toast.success("Message copied!");
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    <textarea 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 h-24 text-sm"
                      placeholder="Type your message here..."
                      value={directMessage.message}
                      onChange={(e) => setDirectMessage({ ...directMessage, message: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={async () => {
                      if(!directMessage.message) return toast.error("Please enter a message");
                      const selectedMedia = mediaItems.find(m => m.id === selectedMediaId);
                      
                      if (selectedMedia && navigator.share) {
                        try {
                           const response = await fetch(selectedMedia.data);
                           const blob = await response.blob();
                           const file = new File([blob], selectedMedia.name, { type: selectedMedia.type });
                           if (navigator.canShare && navigator.canShare({ files: [file] })) {
                             await navigator.share({
                               files: [file],
                               text: directMessage.message,
                             });
                             return;
                           }
                        } catch (err) {
                           console.error("Share failed", err);
                        }
                      }
                      
                      const url = `https://wa.me/?text=${encodeURIComponent(directMessage.message)}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full py-3 flex items-center justify-center gap-2 mb-2"
                  >
                    <Share size={18} />
                    Share Message
                  </Button>
                  <Button 
                    onClick={() => {
                      if(!directMessage.phone || !directMessage.message) return toast.error("Please fill all fields");
                      sendWhatsApp(directMessage.phone, directMessage.message, directMessage.name || "Direct Message");
                    }}
                    className="w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Send Message
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Bulk Message Sender</h3>
                <div className="space-y-4">
                  <Select 
                    label="Select Target Group" 
                    value={bulkSendTarget}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setBulkSendTarget(val);
                      // Calculate dynamic lists to pre-select a first value if needed
                      const uniqueDepts = Array.from(new Set(hospitalEntries.map(entry => entry.department).filter(Boolean)));
                      const uniqueVils = Array.from(new Set((activeModule === 'Hospital' ? hospitalEntries : dairyEntries).map(entry => entry.village).filter(Boolean)));
                      if (val === 'dept') {
                        setBulkSendSelectedSubValue(uniqueDepts[0] || '');
                      } else if (val === 'village') {
                        setBulkSendSelectedSubValue(uniqueVils[0] || '');
                      } else {
                        setBulkSendSelectedSubValue('');
                      }
                    }}
                    options={
                      activeModule === 'Hospital' 
                        ? [{ value: 'all', label: 'All Patients' }, { value: 'dept', label: 'By Department' }, { value: 'village', label: 'By Village' }]
                        : [{ value: 'all', label: 'All Farmers' }, { value: 'village', label: 'By Village' }]
                    } 
                    required
                  />

                  {bulkSendTarget === 'dept' && (
                    <Select 
                      label="Select Department"
                      value={bulkSendSelectedSubValue}
                      onChange={(e: any) => setBulkSendSelectedSubValue(e.target.value)}
                      options={(() => {
                        const uniqueDepts = Array.from(new Set(hospitalEntries.map(entry => entry.department).filter(Boolean)));
                        return uniqueDepts.map(dept => ({ value: dept, label: dept }));
                      })()}
                      required
                    />
                  )}

                  {bulkSendTarget === 'village' && (
                    <Select 
                      label="Select Village"
                      value={bulkSendSelectedSubValue}
                      onChange={(e: any) => setBulkSendSelectedSubValue(e.target.value)}
                      options={(() => {
                        const uniqueVils = Array.from(new Set((activeModule === 'Hospital' ? hospitalEntries : dairyEntries).map(entry => entry.village).filter(Boolean)));
                        return uniqueVils.map(vil => ({ value: vil, label: vil }));
                      })()}
                      required
                    />
                  )}

                  <Select 
                    label="Select Template" 
                    value={bulkSelectedTemplateId}
                    onChange={(e: any) => {
                      const t = templates.find(temp => temp.id === parseInt(e.target.value));
                      setBulkSelectedTemplateId(e.target.value);
                      if (t) {
                        setBulkCustomMessage(t.content);
                      } else {
                        setBulkCustomMessage('');
                      }
                    }}
                    options={[{ value: '', label: 'None' }, ...templates.filter(t => t.module === activeModule).map(t => ({ value: t.id, label: t.name }))]} 
                    required
                  />
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Media Library</p>
                    <div className="flex flex-wrap gap-2">
                       {mediaItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedMediaId(selectedMediaId === item.id ? null : item.id)}
                          className={cn(
                            "relative w-16 h-16 bg-white border rounded-lg overflow-hidden cursor-pointer transition-all group",
                            selectedMediaId === item.id ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                          )}
                        >
                          {item.type.startsWith('image') || item.type.includes('gif') ? (
                            <img src={item.data} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                          ) : item.type.startsWith('video') ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                              <Video size={20} />
                            </div>
                          ) : item.type.includes('pdf') ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-red-400">
                              <FileText size={20} />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                              <BarChart3 size={20} />
                            </div>
                          )}
                          <button 
                            onClick={(e) => handleDeleteMedia(item.id, e)}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white transition-opacity shadow-sm rounded-bl-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <label className="w-16 h-16 bg-white border border-zinc-200 border-dashed rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-900 cursor-pointer transition-all">
                        <PlusCircle size={20} />
                        <input type="file" className="hidden" accept="image/*,video/*,.gif,application/pdf" onChange={handleMediaUpload} />
                      </label>
                    </div>
                    {selectedMediaId && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                          <span className="font-bold uppercase tracking-tight text-[10px] block mb-1">Bulk Media Instructions:</span>
                          When sending in bulk, for each recipient: <br/>
                          1. Attach the file manually. <br/>
                          2. Paste the auto-copied message as caption.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-700">Custom Message (Optional)</label>
                      <button 
                        onClick={() => {
                          if (bulkCustomMessage) {
                            navigator.clipboard.writeText(bulkCustomMessage);
                            toast.success("Message copied!");
                          } else {
                            toast.error("Nothing to copy!");
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    <textarea 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 h-32"
                      placeholder="Type your message here..."
                      value={bulkCustomMessage}
                      onChange={(e) => setBulkCustomMessage(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <Button 
                    onClick={handleSendBulkCampaign}
                    className="w-full py-4 flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Send Bulk Messages
                  </Button>
                </div>
              </Card>

              <Card className="lg:col-span-2 p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Message Logs</h3>
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-zinc-200">
                          <MessageSquare size={18} className="text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{log.recipient_name} ({log.recipient_phone})</p>
                          <p className="text-xs text-zinc-500">{log.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-900">
                          {(() => {
                            try {
                              const d = parseISO(log.sent_at);
                              return isValid(d) ? format(d, 'MMM dd, HH:mm') : 'Invalid date';
                            } catch (e) { return 'Invalid date'; }
                          })()}
                        </p>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{log.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
          )}

          {activeTab === 'whatsapp-crm' && (
            <motion.div
              key="whatsapp-crm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <WhatsAppCRM 
                hospitalEntries={hospitalEntries} 
                dairyEntries={dairyEntries} 
                activeModule={activeModule} 
              />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* User Report Filter UI */}
              <Card className="overflow-hidden border-none shadow-xl">
                <div className="bg-blue-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">User Report (Village to Pincode)</h3>
                </div>
                <div className="p-8 bg-white space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">Village</label>
                      <input 
                        type="text" 
                        placeholder="Village..."
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.village}
                        onChange={(e) => setReportFilters({ ...reportFilters, village: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">Post</label>
                      <input 
                        type="text" 
                        placeholder="Post..."
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.post}
                        onChange={(e) => setReportFilters({ ...reportFilters, post: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">State</label>
                      <select 
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        value={reportFilters.state}
                        onChange={(e) => setReportFilters({ ...reportFilters, state: e.target.value })}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">District</label>
                      <input 
                        type="text" 
                        placeholder="District"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.district}
                        onChange={(e) => setReportFilters({ ...reportFilters, district: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">Block</label>
                      <input 
                        type="text" 
                        placeholder="Block"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.block}
                        onChange={(e) => setReportFilters({ ...reportFilters, block: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">Pincode</label>
                      <input 
                        type="text" 
                        placeholder="Pincode"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.pincode}
                        onChange={(e) => setReportFilters({ ...reportFilters, pincode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-bold text-zinc-900">Search Name/Phone</label>
                      <input 
                        type="text" 
                        placeholder="Type name or phone..."
                        className="w-full max-w-md px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={reportFilters.search}
                        onChange={(e) => setReportFilters({ ...reportFilters, search: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setAppliedReportFilters({ ...reportFilters });
                          toast.success("Filters applied successfully!");
                        }} 
                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                      >
                        <Search size={18} />
                        Filter Data
                      </button>
                      <button 
                        onClick={() => {
                          const cleared = { village: '', post: '', state: '', district: '', block: '', pincode: '', search: '' };
                          setReportFilters(cleared);
                          setAppliedReportFilters(cleared);
                          toast.success("Filters reset successfully!");
                        }}
                        className="flex items-center gap-2 px-8 py-2.5 bg-zinc-600 text-white rounded-lg font-bold hover:bg-zinc-700 transition-all shadow-lg shadow-zinc-200 active:scale-95"
                      >
                        <RotateCcw size={18} />
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-zinc-900">User Detail Report</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportData(filteredReportEntries, 'User_Report')}>
                      <Download size={16} />
                      Download CSV Report
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportPDF(filteredReportEntries, 'User_Report')}>
                      <FileBarChart size={16} />
                      Download PDF Report
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Father / Husband</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">DOB</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Anniversary</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Age</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Village</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Block</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Department</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">District</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Post</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Pincode</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {(() => {
                        const reportPhoneCount = filteredReportEntries.reduce((acc: any, curr: any) => {
                          if (curr.phone) {
                            acc[curr.phone] = (acc[curr.phone] || 0) + 1;
                          }
                          return acc;
                        }, {});

                        return filteredReportEntries.map((entry) => {
                          const isDuplicate = reportPhoneCount[entry.phone] > 1;
                          return (
                            <tr key={entry.id} className={`hover:bg-zinc-50/50 transition-all group ${isDuplicate ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-6 py-4 text-sm font-medium text-zinc-900 border-l-2 border-transparent group-hover:border-zinc-900">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  #{entry.id}
                                  {((entry as any)._source === 'local' || (entry as any)._source === 'fallback') && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-md font-bold uppercase">Local</span>
                                  )}
                                  {isDuplicate && <span title="Duplicate phone number" className="text-amber-500"><AlertTriangle size={12} /></span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 whitespace-nowrap">
                                  {entry.photo ? (
                                    <img src={entry.photo} className="w-8 h-8 rounded-full object-cover border border-zinc-100 shadow-sm" alt="" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100 font-bold text-xs uppercase">
                                      {entry.name?.charAt(0) || 'P'}
                                    </div>
                                  )}
                                  <span className="text-sm font-bold text-zinc-900">{entry.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{(entry as HospitalEntry).father_husband || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 font-mono tabular-nums whitespace-nowrap">{entry.phone}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.dob || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.anniversary || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.age || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.village || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.block || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{(entry as HospitalEntry).department || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.district || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{(entry as HospitalEntry).post || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{entry.pincode || '-'}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{(entry as HospitalEntry).doctor || '-'}</td>
                              <td className="px-6 py-4 sticky right-0 bg-white shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.1)] md:static md:shadow-none min-w-[140px] z-10 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => sendWhatsApp(entry.phone, `Hello ${entry.name},`, entry.name)}
                                    className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleShareEntry(entry)}
                                    className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Share"
                                  >
                                    <Share size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingEntry(entry);
                                      setFormFiles({
                                        photo: entry.photo,
                                        id_card: entry.id_card,
                                        aadhaar_card: (entry as any).aadhaar_card
                                      });
                                      setLocationData({
                                        city: entry.city || '',
                                        state: entry.state || '',
                                        district: entry.district || '',
                                        block: entry.block || '',
                                        village: entry.village || '',
                                        post: entry.post || '',
                                        cities: [],
                                        districts: [],
                                        blocks: [],
                                        villages: []
                                      });
                                      setShowAddModal(true);
                                    }}
                                    className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {filteredReportEntries.length === 0 && (
                        <tr>
                          <td colSpan={15} className="px-6 py-12 text-center text-zinc-500">
                            No entries found matching the filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Location Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={256}>
                    <PieChart>
                      <Pie
                        data={locationDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#18181b" />
                        <Cell fill="#27272a" />
                        <Cell fill="#3f3f46" />
                        <Cell fill="#52525b" />
                        <Cell fill="#71717a" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-zinc-900 mb-6">Age Group Analysis</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={ageGroupDistribution}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#18181b" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="md:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-zinc-900">Message Transmission Reports</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportData(logs, 'Messaging_Report')}>
                      <Download size={16} />
                      Download CSV Report
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => exportPDF(logs, 'Messaging_Report')}>
                      <FileBarChart size={16} />
                      Download PDF Report
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Recipient</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Media</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">{log.recipient_name}</p>
                            <p className="text-xs text-zinc-500">{log.recipient_phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              log.action_type === 'Share' ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-600"
                            )}>
                              {log.action_type || 'Send'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600">
                            {log.media_name ? (
                              <div className="flex items-center gap-1">
                                <FileText size={14} className="text-zinc-400" />
                                <span className="truncate max-w-[150px]">{log.media_name}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600">
                            {(() => {
                              try {
                                const d = parseISO(log.sent_at);
                                return isValid(d) ? format(d, 'MMM dd, yyyy HH:mm') : 'Invalid date';
                              } catch (e) { return 'Invalid date'; }
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">{log.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'states' && (
          <motion.div 
            key="states"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="p-4 md:p-8">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">State Master</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:items-end mb-8 text-left">
                <div className="sm:col-span-2">
                  <Input 
                    label="Enter State Name" 
                    placeholder="Enter State Name"
                    value={newStateName}
                    onChange={(e: any) => setNewStateName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      if (!newStateName.trim()) return toast.error("Please enter a state name");
                      try {
                        const url = editingStateId !== null ? `/api/masters/state_master/${editingStateId}` : '/api/masters/state_master';
                        const method = editingStateId !== null ? 'PUT' : 'POST';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ module: activeModule, name: newStateName })
                        });
                        if (res.ok) {
                          toast.success(editingStateId !== null ? "State updated!" : "State added!");
                          setEditingStateId(null);
                          setNewStateName('');
                          fetchData();
                        }
                      } catch (err) {
                        toast.error("Failed to save state");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 h-[42px] px-8 flex-1"
                  >
                    {editingStateId !== null ? 'Update' : 'Save'}
                  </Button>
                  {editingStateId !== null && (
                    <Button variant="secondary" className="h-[42px]" onClick={() => { setEditingStateId(null); setNewStateName(''); }}>Cancel</Button>
                  )}
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search State..." 
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 w-24">ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">State Name</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 text-center w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stateMasterList
                      .filter(s => String(s.name || '').toLowerCase().includes(stateSearch.toLowerCase()))
                      .map((state) => (
                        <tr key={state.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 text-sm text-zinc-600">{state.id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">{state.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingStateId(state.id);
                                  setNewStateName(state.name);
                                }}
                                className="px-4 py-1.5 bg-amber-400 text-white rounded font-medium text-sm hover:bg-amber-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  showConfirm({
                                    title: `Delete State ${state.name}?`,
                                    message: `Are you sure you want to delete state ${state.name}? This might affect entries mapped to it. This action cannot be undone.`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                      try {
                                        const res = await fetch(`/api/masters/state_master/${state.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          toast.success("State deleted");
                                          fetchData();
                                        }
                                      } catch (err) {
                                        toast.error("Failed to delete state");
                                      }
                                    }
                                  });
                                }}
                                className="px-4 py-1.5 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'districts' && (
          <motion.div 
            key="districts"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="p-4 md:p-8">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">District Master</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:items-end mb-8 text-left">
                <Select 
                  label="Select State" 
                  value={newDistrictState} 
                  onChange={(e: any) => setNewDistrictState(e.target.value)}
                  options={INDIAN_STATES.map(s => ({ value: s, label: s }))}
                />
                <Input 
                  label="Enter District Name" 
                  placeholder="Enter District Name"
                  value={newDistrictName}
                  onChange={(e: any) => setNewDistrictName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      if (!newDistrictName.trim()) return toast.error("Please enter a district name");
                      try {
                        const url = editingDistrictId !== null ? `/api/masters/district_master/${editingDistrictId}` : '/api/masters/district_master';
                        const method = editingDistrictId !== null ? 'PUT' : 'POST';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ module: activeModule, state: newDistrictState, name: newDistrictName })
                        });
                        if (res.ok) {
                          toast.success(editingDistrictId !== null ? "District updated!" : "District added!");
                          setEditingDistrictId(null);
                          setNewDistrictName('');
                          fetchData();
                        }
                      } catch (err) {
                        toast.error("Failed to save district");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 h-[42px] px-8 flex-1"
                  >
                    {editingDistrictId !== null ? 'Update' : 'Save'}
                  </Button>
                  {editingDistrictId !== null && (
                    <Button variant="secondary" className="h-[42px]" onClick={() => { setEditingDistrictId(null); setNewDistrictName(''); }}>Cancel</Button>
                  )}
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search District..." 
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 w-24">ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">State</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">District Name</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 text-center w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {districtMasterList
                      .filter(d => String(d.name || '').toLowerCase().includes(districtSearch.toLowerCase()))
                      .map((district) => (
                        <tr key={district.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 text-sm text-zinc-600">{district.id}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600 font-medium">{district.state}</td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-900">{district.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingDistrictId(district.id);
                                  setNewDistrictName(district.name);
                                  setNewDistrictState(district.state);
                                }}
                                className="px-4 py-1.5 bg-amber-400 text-white rounded font-medium text-sm hover:bg-amber-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  showConfirm({
                                    title: `Delete District ${district.name}?`,
                                    message: `Are you sure you want to delete district ${district.name}? This action cannot be undone.`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                      try {
                                        const res = await fetch(`/api/masters/district_master/${district.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          toast.success("District deleted");
                                          fetchData();
                                        }
                                      } catch (err) {
                                        toast.error("Failed to delete district");
                                      }
                                    }
                                  });
                                }}
                                className="px-4 py-1.5 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div 
            key="staff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-zinc-900">Staff List</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => {
                      setEditingEntry(null);
                      setModalEntryType(activeModule === 'Hospital' ? 'Patient' : 'Farmer');
                      setShowAddModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Add New {activeModule === 'Hospital' ? 'Patient' : 'Farmer'}
                  </Button>
                  <Button variant="secondary" className="flex items-center justify-center gap-1.5" onClick={() => exportData(filteredEntries.filter(e => e.type === 'Staff'), 'Staff_List')}>Export Staff CSV</Button>
                  <Button variant="secondary" className="flex items-center justify-center gap-1.5" onClick={() => exportPDF(filteredEntries.filter(e => e.type === 'Staff'), 'Staff_List')}>Export Staff PDF</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Staff Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Role/Department</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredEntries.filter(e => e.type === 'Staff').map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-zinc-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                              {entry.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-zinc-900">{entry.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{entry.phone}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{entry.department || entry.bmc_dpmc || 'Staff'}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{entry.village}, {entry.block}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { 
                                  setEditingEntry(entry); 
                                  setFormFiles({
                                    photo: entry.photo,
                                    id_card: entry.id_card,
                                    aadhaar_card: entry.aadhaar_card
                                  });
                                  setLocationData({
                                    city: entry.city || '',
                                    state: entry.state || '',
                                    district: entry.district || '',
                                    block: entry.block || '',
                                    village: entry.village || '',
                                    post: entry.post || '',
                                    cities: [],
                                    districts: [],
                                    blocks: [],
                                    villages: []
                                  });
                                  setShowAddModal(true); 
                                }} 
                                className="p-2 text-zinc-400 hover:text-zinc-900 shadow-sm"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  showConfirm({
                                    title: "Delete Staff Member?",
                                    message: `Are you sure you want to delete staff member ${entry.name}? This action cannot be undone.`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                      await fetch(`/api/${activeModule.toLowerCase()}/entries/${entry.id}`, { method: 'DELETE' });
                                      toast.success("Staff member deleted");
                                      fetchData();
                                    }
                                  });
                                }}
                                className="p-2 text-zinc-400 hover:text-red-600 shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.filter(e => e.type === 'Staff').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No staff entries found in current module.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'user-reports' && (
          <motion.div 
            key="user-reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Overview</h3>
                <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                  {activeModule === 'Dairy' ? '🚜 Farmer Analytical Report' : '📋 User Report (Village to Pincode)'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                 <Button variant="secondary" onClick={() => exportData(filteredReportEntries, `${activeModule}_Report`)}>
                   <Download className="mr-2" size={16} /> Export CSV
                 </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl">
              <div className={`${activeModule === 'Dairy' ? 'bg-emerald-600' : 'bg-blue-600'} px-6 py-4`}>
                <h3 className="text-xl font-bold text-white">
                  {activeModule === 'Dairy' ? '🚜 Farmer Analytical Report Filters' : '📋 User Report Filters (Village to Pincode)'}
                </h3>
              </div>
              <div className="p-8 bg-white space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">Village</label>
                    <input 
                      type="text" 
                      placeholder="Village..."
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.village}
                      onChange={(e) => setReportFilters({ ...reportFilters, village: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">Post</label>
                    <input 
                      type="text" 
                      placeholder="Post..."
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.post}
                      onChange={(e) => setReportFilters({ ...reportFilters, post: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">State</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all bg-white font-sans"
                      value={reportFilters.state}
                      onChange={(e) => setReportFilters({ ...reportFilters, state: e.target.value })}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">District</label>
                    <input 
                      type="text" 
                      placeholder="District"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.district}
                      onChange={(e) => setReportFilters({ ...reportFilters, district: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">Block</label>
                    <input 
                      type="text" 
                      placeholder="Block"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.block}
                      onChange={(e) => setReportFilters({ ...reportFilters, block: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">Pincode</label>
                    <input 
                      type="text" 
                      placeholder="Pincode"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.pincode}
                      onChange={(e) => setReportFilters({ ...reportFilters, pincode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-bold text-zinc-900">Search Name/Phone</label>
                    <input 
                      type="text" 
                      placeholder="Type name or phone..."
                      className="w-full max-w-md px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all font-sans"
                      value={reportFilters.search}
                      onChange={(e) => setReportFilters({ ...reportFilters, search: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setAppliedReportFilters({ ...reportFilters });
                        toast.success("Filters applied successfully!");
                      }} 
                      className={`flex items-center gap-2 px-8 py-2.5 ${activeModule === 'Dairy' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white rounded-lg font-bold transition-all shadow-lg active:scale-95`}
                    >
                      <Search size={18} />
                      Filter Data
                    </button>
                    <button 
                      onClick={() => {
                        const cleared = { village: '', post: '', state: '', district: '', block: '', pincode: '', search: '' };
                        setReportFilters(cleared);
                        setAppliedReportFilters(cleared);
                        toast.success("Filters reset successfully!");
                      }}
                      className="flex items-center gap-2 px-8 py-2.5 bg-zinc-600 text-white rounded-lg font-bold hover:bg-zinc-700 transition-all shadow-lg shadow-zinc-200 active:scale-95"
                    >
                      <RotateCcw size={18} />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-zinc-50 border-b border-zinc-100">
                       <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">ID</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                         {activeModule === 'Dairy' ? 'Farmer Details' : 'Patient Details'}
                       </th>
                       {activeModule === 'Dairy' && (
                         <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Age</th>
                       )}
                       <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Full Address (V-P-B-D-S-PIN)</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                         {activeModule === 'Dairy' ? 'Remarks' : 'Doctor'}
                       </th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100">
                     {filteredReportEntries.map((entry, idx) => (
                       <tr key={entry.id} className="hover:bg-zinc-50/50">
                         <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{idx + 1001}</td>
                         <td className="px-6 py-4">
                           <p className="text-sm font-bold text-zinc-900">{entry.name}</p>
                           <p className="text-xs text-zinc-500 font-mono">{entry.phone}</p>
                         </td>
                         {activeModule === 'Dairy' && (
                           <td className="px-6 py-4 text-sm text-zinc-600">{entry.age}</td>
                         )}
                         <td className="px-6 py-4 text-sm text-zinc-600">
                           {entry.village} - {(entry as any).post || '-'} - {entry.block} - {entry.district} - {entry.state} - {entry.pincode}
                         </td>
                         <td className="px-6 py-4 text-sm text-zinc-600">
                           {activeModule === 'Dairy' ? 'Verified' : (entry as HospitalEntry).doctor || '-'}
                         </td>
                       </tr>
                     ))}
                     {filteredReportEntries.length === 0 && (
                       <tr>
                         <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                           No records found matching the filters.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'blocks' && (
          <motion.div 
            key="blocks"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="p-4 md:p-8">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Block Master</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:items-end mb-8 text-left">
                <div>
                  <Select 
                    label="Select District" 
                    value={newBlockDistrict} 
                    onChange={(e: any) => setNewBlockDistrict(e.target.value)}
                    options={[
                      { value: '', label: 'Select District' },
                      ...districtMasterList.map(d => ({ value: d.name, label: d.name }))
                    ]}
                  />
                </div>
                <div>
                  <Input 
                    label="Block Name" 
                    placeholder="Enter Block Name"
                    value={newBlockName}
                    onChange={(e: any) => setNewBlockName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      if (!newBlockName.trim() || !newBlockDistrict) return toast.error("Please fill all fields");
                      try {
                        const url = editingBlockId !== null ? `/api/masters/block_master/${editingBlockId}` : '/api/masters/block_master';
                        const method = editingBlockId !== null ? 'PUT' : 'POST';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ module: activeModule, district: newBlockDistrict, name: newBlockName })
                        });
                        if (res.ok) {
                          toast.success(editingBlockId !== null ? "Block updated!" : "Block added!");
                          setEditingBlockId(null);
                          setNewBlockName('');
                          fetchData();
                        }
                      } catch (err) {
                        toast.error("Failed to save block");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 h-[42px] px-8 flex-1"
                  >
                    {editingBlockId !== null ? 'Update' : 'Save'}
                  </Button>
                  {editingBlockId !== null && (
                    <Button variant="secondary" className="h-[42px]" onClick={() => { setEditingBlockId(null); setNewBlockName(''); }}>Cancel</Button>
                  )}
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Block..." 
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 w-24">ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">District</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">Block</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 text-center w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {blockMasterList
                      .filter(b => String(b.name || '').toLowerCase().includes(blockSearch.toLowerCase()))
                      .map((block) => (
                        <tr key={block.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 text-sm text-zinc-600">{block.id}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600 font-medium">{block.district}</td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-900">{block.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingBlockId(block.id);
                                  setNewBlockName(block.name);
                                  setNewBlockDistrict(block.district);
                                }}
                                className="px-4 py-1.5 bg-amber-400 text-white rounded font-medium text-sm hover:bg-amber-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  showConfirm({
                                    title: `Delete Block ${block.name}?`,
                                    message: `Are you sure you want to delete block ${block.name}? This action cannot be undone.`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                      try {
                                        const res = await fetch(`/api/masters/block_master/${block.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          toast.success("Block deleted");
                                          fetchData();
                                        }
                                      } catch (err) {
                                        toast.error("Failed to delete block");
                                      }
                                    }
                                  });
                                }}
                                className="px-4 py-1.5 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'posts' && (
          <motion.div 
            key="posts"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="p-4 md:p-8">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Post Office Master</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:items-end mb-8 text-left">
                <Select 
                  label="Select State" 
                  value={newPostState} 
                  onChange={(e: any) => setNewPostState(e.target.value)}
                  options={[
                    { value: '', label: 'Select State' },
                    ...INDIAN_STATES.map(s => ({ value: s, label: s }))
                  ]}
                />
                <Select 
                  label="Select District" 
                  value={newPostDistrict} 
                  onChange={(e: any) => setNewPostDistrict(e.target.value)}
                  options={[
                    { value: '', label: 'Select District' },
                    ...districtMasterList.map(d => ({ value: d.name, label: d.name }))
                  ]}
                />
                <Input 
                  label="Post Name" 
                  placeholder="Post Name"
                  value={newPostName}
                  onChange={(e: any) => setNewPostName(e.target.value)}
                />
                <Input 
                  label="Pincode" 
                  placeholder="Pincode"
                  value={newPostPincode}
                  onChange={(e: any) => setNewPostPincode(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      if (!newPostName.trim() || !newPostState || !newPostDistrict || !newPostPincode) return toast.error("Please fill all fields");
                      try {
                        const url = editingPostId !== null ? `/api/masters/post_master/${editingPostId}` : '/api/masters/post_master';
                        const method = editingPostId !== null ? 'PUT' : 'POST';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ module: activeModule, state: newPostState, district: newPostDistrict, name: newPostName, pincode: newPostPincode })
                        });
                        if (res.ok) {
                          toast.success(editingPostId !== null ? "Post updated!" : "Post added!");
                          setEditingPostId(null);
                          setNewPostName('');
                          setNewPostPincode('');
                          fetchData();
                        }
                      } catch (err) {
                        toast.error("Failed to save post");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 h-[42px] px-8 flex-1"
                  >
                    {editingPostId !== null ? 'Update' : 'Save'}
                  </Button>
                  {editingPostId !== null && (
                    <Button variant="secondary" className="h-[42px]" onClick={() => { setEditingPostId(null); setNewPostName(''); setNewPostPincode(''); }}>Cancel</Button>
                  )}
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Post / District / Pincode..." 
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 w-24">ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">State</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">District</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">Post</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900">Pincode</th>
                      <th className="px-6 py-4 text-sm font-bold text-zinc-900 text-center w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {postMasterList
                      .filter(p => 
                        String(p.name || '').toLowerCase().includes(postSearch.toLowerCase()) || 
                        String(p.district || '').toLowerCase().includes(postSearch.toLowerCase()) ||
                        String(p.pincode || '').includes(postSearch)
                      )
                      .map((post) => (
                        <tr key={post.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 text-sm text-zinc-600">{post.id}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600 font-medium">{post.state}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600 font-medium">{post.district}</td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-900">{post.name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600">{post.pincode}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setNewPostName(post.name);
                                  setNewPostState(post.state);
                                  setNewPostDistrict(post.district);
                                  setNewPostPincode(post.pincode);
                                }}
                                className="px-4 py-1.5 bg-amber-400 text-white rounded font-medium text-sm hover:bg-amber-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  showConfirm({
                                    title: `Delete Post ${post.name}?`,
                                    message: `Are you sure you want to delete post ${post.name}? This action cannot be undone.`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                      try {
                                        const res = await fetch(`/api/masters/post_master/${post.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          toast.success("Post deleted");
                                          fetchData();
                                        }
                                      } catch (err) {
                                        toast.error("Failed to delete post");
                                      }
                                    }
                                  });
                                }}
                                className="px-4 py-1.5 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'upload-data' && (
          <motion.div 
            key="upload-data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-8 border-dashed border-2 border-zinc-200 bg-zinc-50/50">
                <div className="text-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white">
                    <Upload size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Import CSV or Excel</h3>
                  <p className="text-zinc-500 mb-8 max-w-sm mx-auto text-sm">Upload your CSV or Excel file to bulk import registrations.</p>
                  
                  <div className="space-y-4 text-left">
                    <div 
                      className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 hover:border-zinc-900 hover:bg-white transition-all cursor-pointer group text-center"
                      onClick={() => document.getElementById('csv_import')?.click()}
                    >
                      <input 
                        type="file" 
                        id="csv_import" 
                        className="hidden" 
                        accept=".csv, .xlsx, .xls" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setImportingFile(file);
                        }}
                      />
                      <Upload className={cn("mx-auto transition-colors mb-4", importingFile ? "text-emerald-500" : "text-zinc-300 group-hover:text-zinc-900")} size={32} />
                      <p className="text-xs font-bold text-zinc-900 mb-1">
                        {importingFile ? importingFile.name : "Click or drag file to upload"}
                      </p>
                    </div>
                    
                        <div className="flex gap-4">
                           <Button variant="secondary" className="flex-1 text-xs" onClick={() => {
                             const sampleRow = {
                               "ID": "1",
                               "Name": "Example Name",
                               "Father / Husband": "Example Guardian",
                               "Phone": "919999999999",
                               "DOB": "1990-01-01",
                               "Anniversary": "2015-05-20",
                               "Age": "34",
                               "Village": "Example Village",
                               "Block": "Example Block",
                               "Department": activeModule === 'Hospital' ? "General" : "Milk",
                               "District": "Basti",
                               "Post": "Example Post",
                               "Pincode": "272001",
                               "Doctor": activeModule === 'Hospital' ? "Dr. Example" : "N/A"
                             };
                             exportData([sampleRow], "Sample_Format");
                           }}>Sample Format</Button>
                           <Button className="flex-1 text-xs" onClick={handleExcelImport} disabled={!importingFile}>Import File</Button>
                        </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-white border border-zinc-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Paste Raw Data</h3>
                    <p className="text-xs text-zinc-500">Paste text records directly (Tab separated)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <textarea 
                    className="w-full h-[180px] p-4 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    placeholder="Paste your records here...
Example format:
1035  9161114636  20-12-2025  Village Name  Block  District"
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                  />
                  <Button 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700"
                    onClick={parseAndUploadRawData}
                    disabled={!pasteData.trim()}
                  >
                    Process and Upload Raw Data
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-start gap-4 text-left">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Users size={20} /></div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-1">Data Quality Guidelines</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Records are automatically deduplicated by ID. If you paste data with existing IDs, the server will skip or merge them depending on current logic. Ensure the columns are roughly in order: ID, Phone, Date, Village, Block, District.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'export-data' && (
          <motion.div 
            key="export-data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-8 group hover:border-zinc-900 transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Hospital size={80} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                    <Hospital size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Hospital Master Data</h3>
                  <p className="text-sm text-zinc-500 mb-8">Export all patient records including medical departments and doctor info.</p>
                  <div className="flex gap-2 w-full">
                    <Button variant="secondary" className="flex-1" onClick={() => exportData(hospitalEntries, 'Hospital_Master_Data')}>
                      <Download className="inline-block mr-1.5" size={14} />
                      CSV
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => exportPDF(hospitalEntries, 'Hospital_Master_Data')}>
                      <FileBarChart className="inline-block mr-1.5" size={14} />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 group hover:border-zinc-900 transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Milk size={80} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                    <Milk size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Dairy Master Data</h3>
                  <p className="text-sm text-zinc-500 mb-8">Export all farmer and customer records with BMC/DPMC mappings.</p>
                  <div className="flex gap-2 w-full">
                    <Button variant="secondary" className="flex-1" onClick={() => exportData(dairyEntries, 'Dairy_Master_Data')}>
                      <Download className="inline-block mr-1.5" size={14} />
                      CSV
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => exportPDF(dairyEntries, 'Dairy_Master_Data')}>
                      <FileBarChart className="inline-block mr-1.5" size={14} />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 group hover:border-zinc-900 transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare size={80} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Communication Logs</h3>
                  <p className="text-sm text-zinc-500 mb-8">Export full messaging history including delivery status and media shared.</p>
                  <div className="flex gap-2 w-full">
                    <Button variant="secondary" className="flex-1" onClick={() => exportData(logs, 'Message_Logs_Export')}>
                      <Download className="inline-block mr-1.5" size={14} />
                      CSV
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => exportPDF(logs, 'Message_Logs_Export')}>
                      <FileBarChart className="inline-block mr-1.5" size={14} />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 group hover:border-zinc-900 transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MapPin size={80} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6">
                    <MapPin size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Location Statistics</h3>
                  <p className="text-sm text-zinc-500 mb-8">Export distribution analysis by state, district, and village.</p>
                  <div className="flex gap-2 w-full">
                    <Button variant="secondary" className="flex-1" onClick={() => exportData(districtMasterList, 'Location_Statistics')}>
                      <Download className="inline-block mr-1.5" size={14} />
                      CSV
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => exportPDF(districtMasterList, 'Location_Statistics')}>
                      <FileBarChart className="inline-block mr-1.5" size={14} />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-6xl mx-auto space-y-8 pb-20 font-sans"
          >
            {/* Hero Header Card */}
            <div className="bg-zinc-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
              <div className="absolute right-0 bottom-0 opacity-10 select-none pointer-events-none transform translate-y-1/4 translate-x-1/12">
                <FileText size={400} />
              </div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wider uppercase text-zinc-300">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Fully Integrated Knowledge Center
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Shri Krishna Platform Manual</h1>
                <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                  Welcome to the universal administration manual for Shri Krishna Mission Hospital and Shri Krishna Sugar & Dairy. Leverage dynamic geographic masters, automated CRM broadcasters, smart digital bills, and reliable storage fallbacks seamlessly.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href="/USER_MANUAL.md"
                    download="Shri_Krishna_User_Manual.md"
                    className="inline-flex items-center gap-2 bg-white text-zinc-900 hover:bg-zinc-100 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <Download size={14} />
                    Download Markdown Manual
                  </a>
                  <button
                    onClick={() => {
                      const manualText = `Shri Krishna Management System - Universal Manual\n\nGenerated: ${new Date().toLocaleDateString()}\n\nContact support@shrikrishnamission.org for global queries.`;
                      const blob = new Blob([manualText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Shri_Krishna_Quick_Guide.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Quick guide text file generated!');
                    }}
                    className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer"
                  >
                    <FileText size={14} />
                    Export Quick Guide (.txt)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Search and Dynamic Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Quick Navigation Panel */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="font-bold text-zinc-805 text-xs uppercase tracking-wider px-1">Manual Content Pages</h3>
                <div className="bg-white rounded-2xl border border-zinc-100 p-3 shadow-sm space-y-1">
                  {[
                    { id: 'switch', label: '1. Module Switching Mode', desc: 'Hospital vs. Dairy toggle' },
                    { id: 'roles', label: '2. Access Control & Staff Roles', desc: 'Admin vs. Agent boundaries' },
                    { id: 'masters', label: '3. Geographic Validation Masters', desc: 'Clean address constraints' },
                    { id: 'templates', label: '4. Placeholder Substitution', desc: 'Template dynamic structures' },
                    { id: 'campaigns', label: '5. High-Impact CRM Broadcasts', desc: 'Device linking & scheduling' },
                    { id: 'invoices', label: '6. Digital Invoice Dispatcher', desc: 'Sending smart receipts on WhatsApp' },
                    { id: 'greetings', label: '7. Birthday & Anniversary Autopilot', desc: 'Automatic greeting logs' },
                    { id: 'import', label: '8. Schema Specifications', desc: 'Excel header guidelines' },
                    { id: 'recovery', label: '9. Offline Storage Fallback', desc: 'Uninterrupted offline backup flow' },
                  ].map((tabItem) => (
                    <button
                      key={tabItem.id}
                      onClick={() => {
                        const targetElement = document.getElementById(`manual-sec-${tabItem.id}`);
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          targetElement.classList.add('bg-zinc-50');
                          setTimeout(() => {
                            targetElement.classList.remove('bg-zinc-50');
                          }, 1500);
                        }
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-zinc-50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {tabItem.id === 'switch' && '🧭'}
                        {tabItem.id === 'roles' && '👥'}
                        {tabItem.id === 'masters' && '🗺️'}
                        {tabItem.id === 'templates' && '💬'}
                        {tabItem.id === 'campaigns' && '📢'}
                        {tabItem.id === 'invoices' && '🧾'}
                        {tabItem.id === 'greetings' && '🎨'}
                        {tabItem.id === 'import' && '📥'}
                        {tabItem.id === 'recovery' && '🛡️'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 leading-tight">{tabItem.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{tabItem.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle size={14} />
                    Reliability Alert
                  </h4>
                  <p className="text-amber-800 text-[11px] leading-relaxed mt-2">
                    When database access is restricted or external network is down, the system shifts to memory fallbacks automatically. Rest assured, patient and farmer entries are safely recorded on local storage!
                  </p>
                </div>
              </div>

              {/* Main Detailed Content Area */}
              <div className="lg:col-span-8 space-y-6">
                {/* Section 1 */}
                <div id="manual-sec-switch" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">🧭</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Module Switcher Mode (Dual Operation)</h4>
                      <p className="text-xs text-zinc-500">Operating the dual interfaces seamlessly</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      The system operates in a unified, modular fashion. With the module switch widget located at the bottom of the left sidebar, users can instantly change context:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-500">
                      <li><strong>🏥 Hospital Mode:</strong> Configured for patient intake files, assigned specialist doctor data, recovery stages, and custom check-up summaries.</li>
                      <li><strong>🚜 Dairy Mode:</strong> Formatted for procurement logistics, sugar/milk farmer lists, daily collection capacity (Liters), fat percentages, and milk validation standards.</li>
                    </ul>
                    <p className="text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 text-zinc-500 font-medium">
                      💡 <strong>Note:</strong> Switching modules changes active templates, geographic dashboards, excel columns, and analytical charts immediately.
                    </p>
                  </div>
                </div>

                {/* Section 2 */}
                <div id="manual-sec-roles" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg">👥</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Platform Access Control & Staff Roles</h4>
                      <p className="text-xs text-zinc-500">Permissions of System Administrators and Operators</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      Security boundaries ensure staff members only execute relevant tasks, while administrative accounts keep control over credentials:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <span className="text-[10px] bg-zinc-900 text-white font-bold tracking-widest px-2 py-0.5 rounded uppercase font-sans">Administrator</span>
                        <ul className="list-disc pl-4 mt-3 text-xs text-zinc-500 space-y-1">
                          <li>Manage, verify, and register custom Staff login tokens.</li>
                          <li>Construct Geographic Validation Masters (States, Districts, Blocks).</li>
                          <li>Global platform settings & WhatsApp API credentials.</li>
                          <li>Permissions to clear lists or delete databases.</li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <span className="text-[10px] bg-zinc-300 text-zinc-800 font-bold tracking-widest px-2 py-0.5 rounded uppercase font-sans">Staff Operator</span>
                        <ul className="list-disc pl-4 mt-3 text-xs text-zinc-500 space-y-1">
                          <li>Add new patient diaries and daily farm procurement rows.</li>
                          <li>Generate instant invoices & send template-driven warnings.</li>
                          <li>View global stats dashboards and state-by-state heatmaps.</li>
                          <li>Restricted from dropping databases or changing API passwords.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div id="manual-sec-masters" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">🗺️</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Geography Masters Hierarchy Validation</h4>
                      <p className="text-xs text-zinc-500">Setting up cleaner intake sheets with nested locations</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      To prevent messy typos in location names and pincodes, the platform relies on cascading validation:
                    </p>
                    <div className="flex items-center justify-center py-4 bg-zinc-50 rounded-2xl my-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-650">
                        <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded">State</span>
                        <ChevronRight size={12} className="text-zinc-400" />
                        <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded">District</span>
                        <ChevronRight size={12} className="text-zinc-400" />
                        <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded">Block</span>
                        <ChevronRight size={12} className="text-zinc-400" />
                        <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded">Post & Pincode</span>
                      </div>
                    </div>
                    <p className="text-xs">
                      When adding an entry (Patient or Farmer), operators select from nested geographic lists. This automatically filters only valid villages and fills the registered pincode in one tap! No manual editing is necessary once masters tables are defined.
                    </p>
                  </div>
                </div>

                {/* Section 4 */}
                <div id="manual-sec-templates" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold text-lg">💬</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Template Substitution System</h4>
                      <p className="text-xs text-zinc-500">Injecting template fields smoothly</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed font-sans">
                    <p>
                      Creating standardized notification templates is simple. When creating custom messages, use dynamic placeholder double-curly braces to personalise output blocks at dispatch time:
                    </p>
                    <div className="overflow-x-auto border border-zinc-100 rounded-2xl">
                      <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-zinc-50">
                            <th className="p-3 font-bold border-b border-zinc-100 text-zinc-700">Variable Tag</th>
                            <th className="p-3 font-bold border-b border-zinc-100 text-zinc-700">Substituted Value</th>
                            <th className="p-3 font-bold border-b border-zinc-100 text-zinc-700">Module Context</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-zinc-100">
                            <td className="p-3 font-mono text-zinc-900">{"{{name}}"}</td>
                            <td className="p-3">Suresh Pal, Rama Devi, etc.</td>
                            <td className="p-3">Global</td>
                          </tr>
                          <tr className="border-b border-zinc-100">
                            <td className="p-3 font-mono text-zinc-900">{"{{village}}"}</td>
                            <td className="p-3">Bargodwa, Nagar Garh, etc.</td>
                            <td className="p-3">Global</td>
                          </tr>
                          <tr className="border-b border-zinc-100">
                            <td className="p-3 font-mono text-zinc-900">{"{{doctor}}"}</td>
                            <td className="p-3">Dr. M. K. Pandey, etc.</td>
                            <td className="p-3">Hospital specific</td>
                          </tr>
                          <tr className="border-b border-zinc-100">
                            <td className="p-3 font-mono text-zinc-900">{"{{quantity}}"}</td>
                            <td className="p-3">12.5 Liters, 4.0 Fat, etc.</td>
                            <td className="p-3">Dairy specific</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Section 5 */}
                <div id="manual-sec-campaigns" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold text-lg">📢</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">High-Impact CRM Broadcaster</h4>
                      <p className="text-xs text-zinc-500">Creating custom WhatsApp campaigns and scheduler queues</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      Create broadcasts with custom safety delay intervals to protect the outbound phone lines:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-zinc-500">
                      <li><strong>Associate Multi-Device Profile:</strong> Pair connected admin devices instantly inside the WhatsApp CRM.</li>
                      <li><strong>Queue Campaign:</strong> Draft your message template and highlight target numbers directly from registered list catalogs.</li>
                      <li><strong>Set Dispatch Spacing:</strong> Designate a safe dispatch window parameter (e.g., 5s to 12s) to spread delivery times cleanly.</li>
                      <li><strong>Observe Real-Time Delivery Metrics:</strong> Monitor campaign progress bars, active queue listings, and dispatch status metrics under the master logs feed.</li>
                    </ol>
                  </div>
                </div>

                {/* Section 6 */}
                <div id="manual-sec-invoices" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">🧾</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Digital Smart Invoices Engine</h4>
                      <p className="text-xs text-zinc-500">Outbox customized receipt details on WhatsApp</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      Generate quick-formatted invoicing reports for consultations or agricultural deliveries:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-500">
                      <li>Enter target patient or farmer billing name and transaction quantity fields directly.</li>
                      <li>Break down consulting services or milk deliveries using the custom lines workspace.</li>
                      <li>Click <strong>Generate Invoice & Send Document</strong> to trigger formatting and push the receipt layout smoothly straight to WhatsApp!</li>
                    </ul>
                  </div>
                </div>

                {/* Section 7 */}
                <div id="manual-sec-greetings" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center font-bold text-lg">🎨</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Automated Daily Greetings</h4>
                      <p className="text-xs text-zinc-500">Setting up birthday and anniversary autopilot dispatches</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed font-sans">
                    <p>
                      Build community relationships without lifting a finger:
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      The system syncs dates dynamically. Matching patient/farmer birth dates or registration anniversaries are highlighted daily. When <strong>Greeting Autopilot</strong> is toggled active, the system automatically checks files at midnight and schedules greetings using assigned templates silently, keeping user outreach active without manual intervention.
                    </p>
                  </div>
                </div>

                {/* Section 8 */}
                <div id="manual-sec-import" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold text-lg">📥</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Import/Export Specs & Excel Header Guidelines</h4>
                      <p className="text-xs text-zinc-500">Technical structure for error-free spreadsheet syncing</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                    <p>
                      When doing bulk uploads, formatting columns accurately is crucial to avoid intake failures:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-500">
                      <li><strong>Name & Phone:</strong> Mandatory fields. Phone should contain country prefix without symbols (e.g. <code>919702213192</code>).</li>
                      <li><strong>Dates (DOB, Anniversary):</strong> Must conform strictly to ISO standard date formatting structures (<code>YYYY-MM-DD</code>).</li>
                      <li><strong>Geographic fields:</strong> Must exist beforehand under geographic validation masters to link records immediately!</li>
                    </ul>
                  </div>
                </div>

                {/* Section 9 */}
                <div id="manual-sec-recovery" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-100 mb-5">
                    <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-lg">🛡️</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-base">Offline Multi-Layer Storage Reliability</h4>
                      <p className="text-xs text-zinc-500">Platform functionality during remote connection loss</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 space-y-3 leading-relaxed font-sans">
                    <p>
                      Your workspace is shielded by an autonomous <strong>Local Fallback Engine</strong>. In case cloud databases decline connections or display network lag:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-500">
                      <li>The engine dynamically switches read/write tracks to local, high-speed RAM buffers and filesystem stores (<code>initial_patients.json</code> & <code>initial_dairy.json</code>).</li>
                      <li>Your templates, registered patients, and message queues remain fully functional offline.</li>
                      <li>No records are lost! Once connectivity stabilizes, your offline cache is automatically preserved and available.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto space-y-8 pb-20"
          >
            {/* Database Status Section */}
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Database Connection</h3>
                  <p className="text-sm text-zinc-500">Global connectivity status</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
                        <Globe size={16} className="text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">Supabase Project</p>
                        <p className="text-xs font-mono text-zinc-600 truncate max-w-[150px]">ais-dev-4lv5wwrix...</p>
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
                        <Shield size={16} className="text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">Authorization</p>
                        <p className="text-xs font-mono text-zinc-600">••••••••••••••••</p>
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>
                </div>

                <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-700">Health Check</h4>
                    <button 
                      onClick={async () => {
                        const loading = toast.loading("Pinging database...");
                        try {
                          const res = await fetch('/api/db-test');
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message, { id: loading });
                          } else {
                            toast.error(data.error || "Connection failed", { id: loading });
                          }
                        } catch (err) {
                          toast.error("Network error during test", { id: loading });
                        }
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      [ Test Connection ]
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    If data is not persisting, ensure <b>SUPABASE_URL</b> and <b>SUPABASE_SERVICE_ROLE_KEY</b> are set in AI Studio Settings. 
                    Run <code>supabase_schema.sql</code> in your SQL Editor to initialize tables.
                  </p>
                </div>
              </div>
            </section>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Institution Identity Card */}
              <Card className="p-8 bg-white shadow-sm border border-zinc-100 rounded-3xl">
                <h3 className="text-2xl font-bold text-zinc-900 mb-8">Institution Identity</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-sm font-medium text-zinc-400">Logo</p>
                       <div className="w-32 h-32 border-2 border-dashed border-zinc-100 rounded-2xl flex items-center justify-center bg-zinc-50/50 mb-4 overflow-hidden relative group">
                          {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                          ) : (
                            <Hospital className="text-zinc-200" size={48} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="text-white" size={24} />
                          </div>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setSettings({ ...settings, logo_url: url });
                              }
                            }}
                          />
                       </div>
                       <div className="flex items-center gap-2">
                         <input type="file" id="logo-upload" className="hidden" />
                         <label htmlFor="logo-upload" className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 cursor-pointer">
                           Choose File
                         </label>
                         <span className="text-xs text-zinc-400">No file chosen</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                      <Input 
                        label="Institution Name" 
                        name="institution_name" 
                        value={settings.institution_name} 
                        onChange={(e: any) => setSettings({ ...settings, institution_name: e.target.value })}
                        placeholder="Enter Institution Name"
                      />
                      <Input 
                        label="Contact Number" 
                        name="contact_number" 
                        value={settings.contact_number} 
                        onChange={(e: any) => setSettings({ ...settings, contact_number: e.target.value })}
                        placeholder="Enter Contact Number"
                      />
                      <Input 
                        label="Email ID" 
                        name="email_id" 
                        value={settings.email_id || ''} 
                        onChange={(e: any) => setSettings({ ...settings, email_id: e.target.value })}
                        placeholder="Enter Email ID"
                      />
                      <Input 
                        label="Website (Optional)" 
                        name="website" 
                        value={settings.website || ''} 
                        onChange={(e: any) => setSettings({ ...settings, website: e.target.value })}
                        placeholder="Enter Website URL"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-600 mb-1">Full Address</p>
                    <textarea 
                      name="full_address"
                      value={settings.full_address}
                      onChange={(e) => setSettings({ ...settings, full_address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-100 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all text-sm min-h-[120px] resize-none"
                      placeholder="Enter Full Address"
                    />
                  </div>
                </div>
              </Card>

              {/* General Settings Card */}
              <div className="space-y-8">
                <Card className="p-8 bg-white shadow-sm border border-zinc-100 rounded-3xl">
                  <h3 className="text-2xl font-bold text-zinc-900 mb-8">General Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                      <Input 
                        label="Hospital Name" 
                        name="hospital_name" 
                        value={settings.hospital_name} 
                        onChange={(e: any) => setSettings({ ...settings, hospital_name: e.target.value })}
                        placeholder="Enter Hospital Name"
                      />
                      <Input 
                        label="WhatsApp API Key" 
                        name="whatsapp_api_key" 
                        value={settings.whatsapp_api_key} 
                        onChange={(e: any) => setSettings({ ...settings, whatsapp_api_key: e.target.value })}
                        placeholder="Enter API Key"
                      />
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <p className="text-sm font-medium text-zinc-600">Auto Birthday Message</p>
                        <div 
                          onClick={() => setSettings({ ...settings, auto_birthday: !settings.auto_birthday })}
                          className={cn(
                            "w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300",
                            settings.auto_birthday ? "bg-emerald-500" : "bg-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                            settings.auto_birthday ? "translate-x-7" : "translate-x-1"
                          )}></div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium text-zinc-600">Auto Anniversary Message</p>
                        <div 
                          onClick={() => setSettings({ ...settings, auto_anniversary: !settings.auto_anniversary })}
                          className={cn(
                            "w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300",
                            settings.auto_anniversary ? "bg-emerald-500" : "bg-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                            settings.auto_anniversary ? "translate-x-7" : "translate-x-1"
                          )}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-lg font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                    Save Settings
                  </Button>
                </Card>

                {/* Staff Management Card */}
                <Card className="p-8 bg-white shadow-sm border border-zinc-100 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-zinc-900">Staff Management</h3>
                    <Button 
                      onClick={() => { setEditingStaff(null); setShowStaffModal(true); }}
                      className="bg-zinc-900 hover:bg-zinc-800"
                    >
                      <PlusCircle size={18} className="mr-2" />
                      Add Staff
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {staffAccounts.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                        <div>
                          <p className="font-bold text-zinc-900">{staff.name}</p>
                          <p className="text-xs text-zinc-500">ID: {staff.username}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                              {viewPasswordId === staff.id ? staff.password : "••••••••"}
                            </p>
                            <button 
                              type="button"
                              onClick={() => setViewPasswordId(viewPasswordId === staff.id ? null : staff.id)}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              {viewPasswordId === staff.id ? "Hide" : "View"}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => { setEditingStaff(staff); setShowStaffModal(true); }}
                            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {staffAccounts.length === 0 && (
                      <div className="text-center py-8 text-zinc-400">
                        <Users className="mx-auto mb-2 opacity-20" size={40} />
                        <p className="text-sm">No regular staff accounts created yet.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-bold text-zinc-900">
                  {editingEntry ? `Edit ${activeModule === 'Hospital' ? 'Patient' : 'Entry'}` : `Add New ${activeModule === 'Hospital' ? 'Patient' : 'Entry'}`}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEntry(null);
                    setFormFiles({});
                  }} 
                  className="p-2 hover:bg-zinc-200 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <form key={editingEntry?.id || 'new'} onSubmit={handleAddEntry} className="p-4 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Select 
                    label="Entry Type" 
                    name="type"
                    value={modalEntryType}
                    onChange={(e: any) => setModalEntryType(e.target.value)}
                    options={activeModule === 'Hospital' ? [
                      { value: 'Patient', label: 'Patient' },
                      { value: 'Doctor', label: 'Doctor' },
                      { value: 'Staff', label: 'Staff' }
                    ] : [
                      { value: 'Farmer', label: 'Farmer' },
                      { value: 'Customer', label: 'Customer' },
                      { value: 'Staff', label: 'Staff' }
                    ]} 
                    required
                  />
                  <Input label="Full Name" name="name" defaultValue={editingEntry?.name} placeholder="Enter name" required />
                  <Input label="Father / Husband Name" name="father_husband" defaultValue={editingEntry?.father_husband} placeholder="Enter father/husband name" />
                  <Input label="Phone Number" name="phone" defaultValue={editingEntry?.phone} placeholder="e.g. 919876543210" required />
                  
                  <Input 
                    label="Pincode" 
                    name="pincode" 
                    defaultValue={editingEntry?.pincode} 
                    placeholder="6-digit Pincode" 
                    onChange={(e: any) => {
                      if (e.target.value.length === 6) fetchLocationByPincode(e.target.value);
                    }}
                  />

                  <ManualSelect 
                    label="City" 
                    name="city" 
                    value={locationData.city || editingEntry?.city || ''} 
                    onChange={(e: any) => setLocationData({ ...locationData, city: e.target.value })}
                    options={[
                      { value: '', label: 'Select City' },
                      ...Array.from(new Set([
                        ...(locationData.state === 'Uttar Pradesh' && locationData.district && UP_DISTRICTS_DATA[locationData.district]
                          ? UP_DISTRICTS_DATA[locationData.district].cities
                          : locationData.cities),
                        ...dynamicMaster.cities,
                        ...(editingEntry?.city ? [editingEntry.city] : [])
                      ])).map(c => ({ value: c, label: c }))
                    ]}
                  />

                  <ManualSelect 
                    label="State" 
                    name="state" 
                    value={locationData.state || editingEntry?.state || ''} 
                    onChange={(e: any) => {
                      const state = e.target.value;
                      setLocationData(prev => ({ 
                        ...prev, 
                        state, 
                        district: '', 
                        block: '',
                        city: '',
                        cities: [],
                        districts: state === 'Uttar Pradesh' ? Object.keys(UP_DISTRICTS_DATA) : [] 
                      }));
                    }}
                    options={[
                      { value: '', label: 'Select State' },
                      ...Array.from(new Set([...INDIAN_STATES, ...dynamicMaster.states])).map(s => ({ value: s, label: s }))
                    ]}
                  />

                  <Input label="Date of Birth" name="dob" defaultValue={editingEntry?.dob} type="date" />
                  <Input label="Anniversary" name="anniversary" defaultValue={editingEntry?.anniversary} type="date" />
                  <Input label="Age" name="age" defaultValue={editingEntry?.age} type="number" placeholder="Age" />
                  
                  <ManualSelect 
                    label="Village" 
                    name="village" 
                    value={locationData.village || editingEntry?.village || ''} 
                    onChange={(e: any) => setLocationData({ ...locationData, village: e.target.value })}
                    options={[
                      { value: '', label: 'Select Village' },
                      ...Array.from(new Set([
                        ...locationData.villages,
                        ...dynamicMaster.villages,
                        ...(editingEntry?.village ? [editingEntry.village] : [])
                      ])).map(v => ({ value: v, label: v }))
                    ]}
                  />

                  <ManualSelect 
                    label="Post" 
                    name="post" 
                    value={locationData.post || editingEntry?.post || ''} 
                    onChange={(e: any) => setLocationData({ ...locationData, post: e.target.value })}
                    options={[
                      { value: '', label: 'Select Post' },
                      ...Array.from(new Set([
                        ...locationData.villages, // Usually villages are posts in rural areas, but let's be safe
                        ...dynamicMaster.posts,
                        ...(editingEntry?.post ? [editingEntry.post] : [])
                      ])).map(p => ({ value: p, label: p }))
                    ]}
                  />

                  <ManualSelect 
                    label="Block" 
                    name="block" 
                    value={locationData.block || editingEntry?.block || ''} 
                    onChange={(e: any) => setLocationData({ ...locationData, block: e.target.value })}
                    options={[
                      { value: '', label: 'Select Block' },
                      ...Array.from(new Set([
                        ...(locationData.state === 'Uttar Pradesh' && locationData.district && UP_DISTRICTS_DATA[locationData.district]
                          ? UP_DISTRICTS_DATA[locationData.district].blocks
                          : locationData.blocks),
                        ...dynamicMaster.blocks,
                        ...(editingEntry?.block ? [editingEntry.block] : [])
                      ])).map(b => ({ value: b, label: b }))
                    ]}
                  />

                  <ManualSelect 
                    label="District" 
                    name="district" 
                    value={locationData.district || editingEntry?.district || ''} 
                    onChange={(e: any) => {
                      const dist = e.target.value;
                      setLocationData(prev => ({ 
                        ...prev, 
                        district: dist,
                        block: '',
                        city: '',
                        blocks: (prev.state === 'Uttar Pradesh' && UP_DISTRICTS_DATA[dist]) ? UP_DISTRICTS_DATA[dist].blocks : prev.blocks,
                        cities: (prev.state === 'Uttar Pradesh' && UP_DISTRICTS_DATA[dist]) ? UP_DISTRICTS_DATA[dist].cities : prev.cities
                      }));
                    }}
                    options={[
                      { value: '', label: 'Select District' },
                      ...Array.from(new Set([
                        ...(locationData.state === 'Uttar Pradesh' ? Object.keys(UP_DISTRICTS_DATA) : locationData.districts),
                        ...dynamicMaster.districts,
                        ...(editingEntry?.district ? [editingEntry.district] : [])
                      ])).map(d => ({ value: d, label: d }))
                    ]}
                  />

                  {activeModule === 'Hospital' ? (
                    <>
                      <ManualSelect 
                        label="Doctor Name" 
                        name="doctor" 
                        defaultValue={editingEntry?.doctor} 
                        placeholder="Dr. Name" 
                        options={Array.from(new Set([
                          'Dr. Gupta', 'Dr. Singh', 'Dr. Mehta',
                          ...hospitalEntries.map(e => e.doctor).filter(Boolean)
                        ])).map(d => ({ value: d, label: d }))}
                      />
                      <ManualSelect 
                        label="Department" 
                        name="department" 
                        defaultValue={editingEntry?.department} 
                        placeholder="Cardiology, etc." 
                        options={Array.from(new Set([
                          'Cardiology', 'Orthopedics', 'Pediatrics',
                          ...hospitalEntries.map(e => e.department).filter(Boolean)
                        ])).map(d => ({ value: d, label: d }))}
                      />
                      <FileInput 
                        label="Upload Photo" 
                        name="photo_input" 
                        accept="image/*" 
                        onChange={(base64: string) => setFormFiles(prev => ({ ...prev, photo: base64 }))} 
                        required={false}
                      />
                      <FileInput 
                        label="Upload ID Card" 
                        name="id_card_input" 
                        accept="image/*,application/pdf" 
                        onChange={(base64: string) => setFormFiles(prev => ({ ...prev, id_card: base64 }))} 
                        required={false}
                      />
                    </>
                  ) : (
                    <>
                      <ManualSelect 
                        label="BMC / DPMC" 
                        name="bmc_dpmc" 
                        defaultValue={editingEntry?.bmc_dpmc} 
                        placeholder="BMC/DPMC Name" 
                        options={Array.from(new Set([
                          'BMC North', 'DPMC South', 'Staff HQ',
                          ...dairyEntries.map(e => e.bmc_dpmc).filter(Boolean)
                        ])).map(b => ({ value: b, label: b }))}
                      />
                      <Input label="Aadhar Number" name="aadhar" defaultValue={editingEntry?.aadhar} placeholder="12-digit Aadhar" />
                      <FileInput 
                        label="Upload Photo" 
                        name="photo_input_dairy" 
                        accept="image/*" 
                        onChange={(base64: string) => setFormFiles(prev => ({ ...prev, photo: base64 }))} 
                        required={false}
                      />
                      <FileInput 
                        label="Upload Aadhaar Card" 
                        name="aadhaar_card_input" 
                        accept="image/*,application/pdf" 
                        onChange={(base64: string) => setFormFiles(prev => ({ ...prev, aadhaar_card: base64 }))} 
                        required={false}
                      />
                    </>
                  )}
                  <Input 
                    label={modalEntryType === 'Staff' ? "Staff Login Password" : "Login Password (Optional)"}
                    name="password" 
                    type="password"
                    defaultValue={editingEntry?.password} 
                    placeholder="Enter login password" 
                    required={modalEntryType === 'Staff'}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEntry(null);
                      setFormFiles({});
                      setLocationData({ city: '', state: '', district: '', block: '', village: '', post: '', cities: [], districts: [], blocks: [], villages: [] });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{editingEntry ? 'Update Entry' : 'Save Entry'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplatePicker && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div>
                  <h3 className="font-bold text-zinc-900">Send {showTemplatePicker.type} Wish</h3>
                  <p className="text-xs text-zinc-500">To: {showTemplatePicker.name} ({showTemplatePicker.phone})</p>
                </div>
                <button onClick={() => setShowTemplatePicker(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Select Template</p>
                <div className="grid gap-3">
                  {templates
                    .filter(t => t.type === showTemplatePicker.type || t.type === 'Custom')
                    .map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          const msg = t.content.replace(/\{\{[^}]+\}\}/g, showTemplatePicker.name);
                          sendWhatsApp(showTemplatePicker.phone, msg, showTemplatePicker.name);
                          setShowTemplatePicker(null);
                        }}
                        className="text-left p-4 border border-zinc-100 rounded-xl hover:border-zinc-900 hover:bg-zinc-50 transition-all group"
                      >
                        <p className="text-xs font-bold text-zinc-400 mb-1">{t.name}</p>
                        <p className="text-sm text-zinc-600 line-clamp-2">{t.content.replace(/\{\{[^}]+\}\}/g, showTemplatePicker.name)}</p>
                      </button>
                    ))}
                </div>

                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Attach Media (Optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {mediaItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedMediaId(selectedMediaId === item.id ? null : item.id)}
                        className={cn(
                          "relative w-14 h-14 bg-white border rounded-lg overflow-hidden cursor-pointer transition-all group",
                          selectedMediaId === item.id ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                        )}
                      >
                        {item.type.startsWith('image') ? (
                          <img src={item.data} className="w-full h-full object-cover" alt="" />
                        ) : item.type.startsWith('video') ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                            <Video size={18} />
                          </div>
                        ) : item.type.includes('pdf') ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-red-400">
                            <FileText size={18} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                            <BarChart3 size={18} />
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleDeleteMedia(item.id, e)}
                          className="absolute top-0 right-0 p-1 bg-red-500 text-white transition-opacity shadow-sm rounded-bl-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="w-14 h-14 bg-white border border-zinc-200 border-dashed rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-900 cursor-pointer transition-all">
                      <PlusCircle size={18} />
                      <input type="file" className="hidden" accept="image/*,video/*,.gif,application/pdf" onChange={handleMediaUpload} />
                    </label>
                  </div>
                  {selectedMediaId && (
                    <p className="mt-2 text-[10px] text-zinc-500 italic">
                      Note: Message copied to clipboard! Paste it as a caption after attaching the file in WhatsApp.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6 bg-zinc-50 border-t border-zinc-100">
                <Button 
                  onClick={() => {
                    const msg = `Happy ${showTemplatePicker.type} ${showTemplatePicker.name}!`;
                    sendWhatsApp(showTemplatePicker.phone, msg, showTemplatePicker.name);
                    setShowTemplatePicker(null);
                  }}
                  className="w-full py-3"
                >
                  Send Default Wish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-700 transition-colors border-0"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-extrabold flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-600" />
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
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <Copy size={13} />
                      Copy Card to Clipboard
                    </button>
                  )}
                  <button
                    onClick={() => downloadMediaFile(attachmentGuide.media.data, attachmentGuide.media.name)}
                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    <Download size={13} />
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
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-950 text-white font-extrabold rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
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
                  className="px-4 py-2.5 bg-zinc-150 hover:bg-zinc-200 text-zinc-650 hover:text-zinc-800 font-extrabold rounded-xl text-xs uppercase cursor-pointer border-0"
                >
                  Dismiss
                </button>
                <a
                  href={`https://wa.me/${attachmentGuide.phone}?text=${encodeURIComponent(attachmentGuide.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAttachmentGuide(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer flex-1 md:flex-none border-0 text-center select-none"
                >
                  Go to WhatsApp Chat &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showBulkGreetingsModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8 overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg flex items-center gap-2">
                    <span>🚀 Group Greetings / Wishes</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">Bulk</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Dispatched sequentially matching active anti-ban delay parameters</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowBulkGreetingsModal(false)} 
                  className="p-2 hover:bg-zinc-200 rounded-full transition-all text-zinc-400 hover:text-zinc-950 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLaunchBulkGreetings} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Selected Recipients Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Selected Recipients ({selectedEntryIds.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-zinc-50 border border-zinc-150 rounded-xl">
                    {(activeModule === 'Hospital' ? hospitalEntries : dairyEntries)
                      .filter(entry => selectedEntryIds.includes(entry.id))
                      .map(entry => (
                        <span 
                          key={entry.id} 
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium shadow-sm"
                        >
                          <span>{entry.name}</span>
                          <span className="text-[10px] leading-none text-zinc-400 font-mono">({entry.phone})</span>
                          <button
                            type="button"
                            onClick={() => setSelectedEntryIds(prev => prev.filter(id => id !== entry.id))}
                            className="text-zinc-400 hover:text-red-500 font-bold ml-0.5"
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>

                {/* Sender Channel Account Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Select Active WhatsApp Channel (Sender)
                  </label>
                  <select
                    className="w-full px-4 py-2 text-sm bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 rounded-xl transition-all cursor-pointer font-medium"
                    value={campaignAccount}
                    onChange={(e) => setCampaignAccount(Number(e.target.value))}
                    required
                  >
                    {whatsappAccounts.length === 0 ? (
                      <option value={1}>Marketing Account Fallback (Active)</option>
                    ) : (
                      whatsappAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.phone || 'Ready'}) {acc.status === 'authenticated' ? '🟢 Connected' : '🟡 Offline'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Sender Mobile Number Display Box */}
                {(() => {
                  const selectedAcc = whatsappAccounts.find(a => Number(a.id) === Number(campaignAccount));
                  if (selectedAcc) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-1 text-xs text-emerald-800 animate-fade-in shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>
                            Sending messages via: <strong>"{selectedAcc.name}"</strong>
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                          Sender Mobile Number (Visible to Admin): <strong className="font-mono text-emerald-950 font-bold text-xs">{selectedAcc.phone || '+91 99887 76655 (Standard Portal Line)'}</strong>
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-1 text-xs text-emerald-800 animate-fade-in shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>
                            Sending messages via: <strong>"Marketing Account Fallback"</strong>
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                          Sender Mobile Number (Visible to Admin): <strong className="font-mono text-emerald-950 font-bold text-xs">+91 99887 76655 (Standard Portal Line)</strong>
                        </p>
                      </div>
                    );
                  }
                })()}

                {/* Campaign Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Campaign / Group Name
                  </label>
                  <input
                    type="text"
                    value={bulkCampaignName}
                    onChange={(e) => setBulkCampaignName(e.target.value)}
                    placeholder="E.g., Festive Wishes / Custom Promo"
                    className="w-full px-4 py-2 text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 rounded-xl transition-all"
                    required
                  />
                </div>

                {/* Templates Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Use Pre-saved Template (Optional)
                  </label>
                  <select
                    className="w-full px-4 py-2 text-sm bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 rounded-xl transition-all cursor-pointer"
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (selectedVal) {
                        setBulkCampaignTemplate(selectedVal);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Choose template content --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.content}>
                        [{t.type}] {t.name}
                      </option>
                    ))}
                    <option value="Dear {{name}}, Happy celebrations! Wishing you and your family immense joy and success. 🎉">
                      [Default] Celebration Wishes
                    </option>
                    <option value="Happy Birthday, {{name}}! Wishing you a fantastic year filled with achievements, laughter, and robust health. 🎂🎈">
                      [Default] Birthday Greetings
                    </option>
                    <option value="Happy Anniversary, {{name}}! We are thrilled to celebrate this wonderful milestone with you. Wishing you everlasting happiness! 💝">
                      [Default] Anniversary Greetings
                    </option>
                  </select>
                </div>

                {/* Message Canvas Template Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Compose Message Greetings
                    </label>
                    <span className="text-[10px] text-zinc-400">Use <strong className="text-zinc-650 font-mono">{{name}}</strong> for recipient name</span>
                  </div>
                  <textarea
                    value={bulkCampaignTemplate}
                    onChange={(e) => setBulkCampaignTemplate(e.target.value)}
                    placeholder="Enter greeting content..."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 rounded-xl transition-all font-sans"
                    required
                  />
                </div>

                {/* Media Selector list */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Attach Greeting Graphic Card (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2.5 p-1">
                    <button
                      type="button"
                      onClick={() => setBulkCampaignMediaId(null)}
                      className={cn(
                        "w-14 h-14 bg-zinc-50 hover:bg-zinc-100 border rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all cursor-pointer",
                        bulkCampaignMediaId === null ? "border-zinc-900 text-zinc-900 bg-white ring-2 ring-zinc-950/5" : "border-zinc-200 text-zinc-400"
                      )}
                    >
                      <span>No Media</span>
                    </button>
                    {mediaItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setBulkCampaignMediaId(bulkCampaignMediaId === item.id ? null : item.id)}
                        className={cn(
                          "relative w-14 h-14 bg-white border rounded-xl overflow-hidden cursor-pointer transition-all group",
                          bulkCampaignMediaId === item.id ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                        )}
                      >
                        {item.type.startsWith('image') ? (
                          <img src={item.data} className="w-full h-full object-cover" alt="" />
                        ) : item.type.startsWith('video') ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400">
                            <Video size={16} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400">
                            <FileText size={16} />
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 truncate bg-black/60 text-white text-[8px] px-1 py-0.5 text-center leading-3">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate-Limit Delay Security interval control */}
                <div className="space-y-1.5 bg-zinc-50/50 p-4 border border-zinc-150 rounded-2xl">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <span>Anti-Ban Dispatch Delay</span>
                    <span className="text-emerald-600 font-extrabold font-mono text-sm">{bulkCampaignDelay}s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={bulkCampaignDelay}
                    onChange={(e) => setBulkCampaignDelay(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Adds a random offset buffer next to this frequency buffer to simulate natural human engagement and secure active sending licenses against bans.
                  </p>
                </div>

                {/* Real-time Dynamic Preview */}
                <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest block">Live Message Preview:</span>
                  <div className="text-xs text-zinc-700 leading-relaxed font-sans font-medium italic break-words">
                    {bulkCampaignTemplate ? (
                      bulkCampaignTemplate.replace('{{name}}', 
                        (activeModule === 'Hospital' ? hospitalEntries : dairyEntries).find(entry => selectedEntryIds.includes(entry.id))?.name || 'Customer'
                      )
                    ) : (
                      <span className="text-zinc-400 italic">No Content. Type your message above...</span>
                    )}
                  </div>
                </div>

                {/* Modal actions footer */}
                <div className="flex gap-4 pt-3">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1 py-2 rounded-xl text-xs font-bold"
                    onClick={() => setShowBulkGreetingsModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 py-2 rounded-xl bg-zinc-900 text-xs font-bold hover:bg-zinc-805 text-white"
                  >
                    Schedule Launch Campaign
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 text-lg">
                  {editingStaff ? 'Edit Staff Account' : 'Add Staff Account'}
                </h3>
                <button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all text-zinc-400">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveStaff} className="p-8 space-y-6">
                <Input 
                  label="Staff Full Name" 
                  name="name" 
                  defaultValue={editingStaff?.name} 
                  placeholder="Enter staff name" 
                  required 
                />
                <Input 
                  label="Staff Login ID" 
                  name="username" 
                  defaultValue={editingStaff?.username} 
                  placeholder="Enter login ID" 
                  required 
                />
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-zinc-700">Login Password</label>
                  <input 
                    type="password"
                    name="password"
                    defaultValue={editingStaff?.password}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono"
                    placeholder="Enter password"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-tighter">This password will be stored in plain text for this version.</p>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1 py-3"
                    onClick={() => setShowStaffModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 py-3 bg-zinc-900">
                    {editingStaff ? 'Update Account' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddTemplateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button onClick={() => setShowAddTemplateModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTemplate} className="p-6 space-y-4">
                <Input 
                  label="Template Name" 
                  name="name" 
                  defaultValue={editingTemplate?.name} 
                  placeholder="e.g. Birthday Wish" 
                  required 
                />
                <Select 
                  label="Template Category" 
                  name="type" 
                  defaultValue={editingTemplate?.type || 'Custom'}
                  options={[
                    { value: 'Birthday', label: 'Birthday' },
                    { value: 'Anniversary', label: 'Anniversary' },
                    { value: 'Bulk', label: 'Bulk Greeting' },
                    { value: 'Custom', label: 'Custom' }
                  ]}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Message Content</label>
                  <textarea 
                    name="content"
                    defaultValue={editingTemplate?.content}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                    placeholder="Use {{name}} placeholder for dynamic names"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-zinc-100">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => setShowAddTemplateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mediaToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">Delete Media?</h3>
              <p className="text-sm text-zinc-500 mb-6">This action cannot be undone. Are you sure you want to remove this file?</p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setMediaToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                  onClick={confirmDeleteMedia}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-zinc-950 text-center text-lg mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-zinc-500 text-center mb-6">{confirmDialog.message}</p>
              
              {confirmDialog.requireInputMatch && (
                <div className="mb-6 space-y-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-left">Type "{confirmDialog.requireInputMatch}" to confirm</p>
                  <input 
                    type="text"
                    value={confirmInput}
                    placeholder={`Type ${confirmDialog.requireInputMatch}`}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    className="w-full px-4 py-2 text-center rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono"
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setConfirmDialog(null)}
                >
                  {confirmDialog.cancelText || "Cancel"}
                </Button>
                <Button 
                  disabled={confirmDialog.requireInputMatch ? confirmInput !== confirmDialog.requireInputMatch : false}
                  className={`flex-1 text-white border-none ${confirmDialog.title.toLowerCase().includes('danger') || confirmDialog.title.toLowerCase().includes('delete') ? 'bg-red-600 hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-400' : 'bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400'}`}
                  onClick={async () => {
                    const confirmFn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await confirmFn();
                  }}
                >
                  {confirmDialog.confirmText || "Confirm"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
