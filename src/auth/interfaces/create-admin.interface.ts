export interface CreateAdmin {
  full_name: string;
  email: string;
  user_name: string;
  role: string;
  device_ids: string[];
  password: string;
}