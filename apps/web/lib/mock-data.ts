export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Column {
  name: string
  type: string
  isPK?: boolean
  isFK?: boolean
  isNullable?: boolean
  description?: string
}

export interface Table {
  name: string
  type: "fact" | "dimension" | "bridge" | "staging"
  description: string
  columns: Column[]
}

export interface Schema {
  name: string
  icon: string
  tables: Record<string, Table>
}

export const mockProjects: Project[] = [
  {
    id: "efldwh",
    name: "EFL Data Warehouse",
    description: "Loan analytics system for NBFCs with comprehensive lending metrics",
    createdAt: "2024-01-15",
    updatedAt: "2024-03-20",
  },
  {
    id: "ayedwh",
    name: "AYE Data Warehouse",
    description: "Customer-centric DWH for financial data and behavioral analytics",
    createdAt: "2024-02-01",
    updatedAt: "2024-03-18",
  },
  {
    id: "retaildwh",
    name: "Retail Analytics DWH",
    description: "Multi-channel retail data warehouse for sales and inventory tracking",
    createdAt: "2024-02-20",
    updatedAt: "2024-03-15",
  },
]

export const mockSchemas: Record<string, Record<string, Schema>> = {
  efldwh: {
    Lending: {
      name: "Lending",
      icon: "💰",
      tables: {
        Fact_Loans: {
          name: "Fact_Loans",
          type: "fact",
          description: "Loan transaction details and metrics",
          columns: [
            { name: "loan_id", type: "bigint", isPK: true, description: "Primary key for loan transactions" },
            { name: "customer_id", type: "bigint", isFK: true, description: "Foreign key to customer dimension" },
            { name: "loan_amount", type: "decimal(15,2)", description: "Principal loan amount" },
            { name: "interest_rate", type: "decimal(5,2)", description: "Annual interest rate percentage" },
            { name: "loan_term_months", type: "int", description: "Loan duration in months" },
            { name: "disbursement_date", type: "date", description: "Date when loan was disbursed" },
            { name: "status", type: "varchar(50)", description: "Current loan status" },
          ],
        },
        Dim_Customer: {
          name: "Dim_Customer",
          type: "dimension",
          description: "Customer demographic and profile information",
          columns: [
            { name: "customer_id", type: "bigint", isPK: true },
            { name: "customer_name", type: "varchar(255)" },
            { name: "email", type: "varchar(255)" },
            { name: "phone", type: "varchar(20)" },
            { name: "credit_score", type: "int" },
            { name: "registration_date", type: "date" },
          ],
        },
      },
    },
    Payments: {
      name: "Payments",
      icon: "💳",
      tables: {
        Fact_Payments: {
          name: "Fact_Payments",
          type: "fact",
          description: "Payment transactions and EMI details",
          columns: [
            { name: "payment_id", type: "bigint", isPK: true },
            { name: "loan_id", type: "bigint", isFK: true },
            { name: "payment_date", type: "date" },
            { name: "payment_amount", type: "decimal(15,2)" },
            { name: "payment_method", type: "varchar(50)" },
            { name: "payment_status", type: "varchar(50)" },
          ],
        },
      },
    },
  },
  ayedwh: {
    Customer: {
      name: "Customer",
      icon: "👤",
      tables: {
        Dim_Customer: {
          name: "Dim_Customer",
          type: "dimension",
          description: "Customer master data",
          columns: [
            { name: "customer_key", type: "bigint", isPK: true },
            { name: "customer_id", type: "varchar(50)" },
            { name: "full_name", type: "varchar(255)" },
            { name: "age", type: "int" },
            { name: "gender", type: "varchar(10)" },
            { name: "location", type: "varchar(255)" },
          ],
        },
      },
    },
  },
  retaildwh: {
    Sales: {
      name: "Sales",
      icon: "🛒",
      tables: {
        Fact_Sales: {
          name: "Fact_Sales",
          type: "fact",
          description: "Sales transactions across all channels",
          columns: [
            { name: "sale_id", type: "bigint", isPK: true },
            { name: "product_id", type: "bigint", isFK: true },
            { name: "store_id", type: "bigint", isFK: true },
            { name: "sale_date", type: "date" },
            { name: "quantity", type: "int" },
            { name: "unit_price", type: "decimal(10,2)" },
            { name: "total_amount", type: "decimal(15,2)" },
          ],
        },
      },
    },
  },
}

export const mockRecentActivity = [
  {
    id: "1",
    action: "Created table",
    target: "Fact_Loans",
    project: "EFL Data Warehouse",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    action: "Updated schema",
    target: "Lending",
    project: "EFL Data Warehouse",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    action: "Added column",
    target: "Dim_Customer.credit_score",
    project: "AYE Data Warehouse",
    timestamp: "1 day ago",
  },
]
