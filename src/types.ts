export interface HospitalEntry {
  id: number;
  type?: 'Patient' | 'Doctor' | 'Staff';
  name: string;
  father_husband?: string;
  phone: string;
  dob: string;
  anniversary: string;
  doctor: string;
  department: string;
  village: string;
  post?: string;
  block: string;
  district: string;
  pincode?: string;
  city?: string;
  state?: string;
  age: number;
  photo?: string;
  id_card?: string;
  password?: string;
  created_at: string;
}

export interface DairyEntry {
  id: number;
  type: 'Farmer' | 'Customer' | 'Staff';
  name: string;
  phone: string;
  dob: string;
  anniversary: string;
  village: string;
  block: string;
  pincode?: string;
  city?: string;
  state?: string;
  district?: string;
  bmc_dpmc: string;
  aadhar: string;
  age: number;
  photo?: string;
  aadhaar_card?: string;
  password?: string;
  created_at: string;
}

export interface Template {
  id: number;
  module: 'Hospital' | 'Dairy';
  name: string;
  content: string;
  type: 'Birthday' | 'Anniversary' | 'Bulk' | 'Custom';
}

export interface MediaItem {
  id: number;
  module: 'Hospital' | 'Dairy';
  name: string;
  type: string;
  data: string;
  created_at: string;
}

export interface MessageLog {
  id: number;
  module: string;
  recipient_name: string;
  recipient_phone: string;
  message: string;
  status: string;
  sent_at: string;
}
