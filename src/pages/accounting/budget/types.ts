export type MisBudgetAccount = {
  id: string;
  code: string;
  name: string;
  category_code: string;
};

export type MisBudgetRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_code: string;
  months: number[];
};

export type MisBudgetSavePayload = {
  entity_id: string;
  account_id: string;
  budget_year: number;
  amounts: number[];
};