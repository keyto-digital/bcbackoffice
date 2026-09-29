export type MisMacroRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_code: string;
  division_code: string;

  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  december: number;

  last_month: number;
  actual: number;
  budget: number;
  last_year: number;
  ytd: number;
  ytd_budget: number;
  last_year_ytd: number;
};

export type MisMacroMonth = {
  value: number;
  label: string;
};

export type MisBsDetailRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_code: string;
  normal_balance: string;
  last_month: number;
  actual: number;
  variance: number;
};