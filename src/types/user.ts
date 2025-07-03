export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserFormData {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export interface RequestPayload {
  user: {
    id: number;
    email: string;
    role: string;
  };
  newUser: UserFormData;
}

export interface UpdateUserRequestPayload {
  user: {
    id: number;
    email: string;
    role: string;
  };
  updateData: UpdateUserFormData;
} 