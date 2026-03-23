export interface ZapSignCreateDocInput {
  name: string;
  base64_pdf: string;
  signers: ZapSignSigner[];
  lang?: string;
  send_automatic_email?: boolean;
}

export interface ZapSignSigner {
  name: string;
  email: string;
  send_automatic_email?: boolean;
  lock_name?: boolean;
  lock_email?: boolean;
}

export interface ZapSignDocResponse {
  open_id: number;
  token: string;
  status: string;
  name: string;
  signers: { token: string; name: string; email: string; status: string }[];
  created_at: string;
}

export interface ZapSignSignResponse {
  status: string;
  signed_at: string;
}
