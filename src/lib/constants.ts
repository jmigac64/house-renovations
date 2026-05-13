export const DEFAULT_CATEGORIES = [
  "Permits and documentation",
  "Labor",
  "Materials",
  "Tools and equipment",
  "Plumbing",
  "Electrical",
  "Heating and cooling",
  "Flooring",
  "Windows and doors",
  "Furniture",
  "Appliances",
  "Transport and delivery",
  "Waste disposal",
  "Cleaning",
  "Unexpected costs",
  "Other",
] as const;

export const DEFAULT_PHASES = [
  "Planning and permits",
  "Demolition",
  "Structural work",
  "Plumbing",
  "Electrical",
  "Heating and cooling",
  "Insulation",
  "Windows and doors",
  "Flooring",
  "Walls and painting",
  "Furniture and fixtures",
  "Cleaning and finishing",
] as const;

export const DEFAULT_ROOMS = [
  "Kitchen",
  "Bathroom",
  "Living room",
  "Bedroom",
  "Hallway",
  "Basement",
  "Attic",
  "Garage",
  "Exterior",
  "Garden",
  "Whole house",
] as const;

export const EDITOR_ROLES = ["OWNER", "EDITOR"] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
] as const;
