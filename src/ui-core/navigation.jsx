import {
  Activity,
  Code2,
  FilePlus2,
  FolderInput,
  Inbox,
  Info,
  Layers3,
  Network,
  Search,
  Settings
} from "lucide-react";

export const navigation = Object.freeze([
  { to: "/", label: "Research", mobileLabel: "Research", Icon: Activity, match: (path) => path === "/" },
  { to: "/graph", label: "Graph", mobileLabel: "Graph", Icon: Network, match: (path) => path === "/graph" || path.startsWith("/graph/") },
  { to: "/datasets", label: "Datasets", mobileLabel: "Data", Icon: Layers3, match: (path) => path === "/datasets" || path.startsWith("/datasets/") },
  { to: "/documents", label: "Documents", mobileLabel: "Docs", Icon: Search, match: (path) => path === "/documents" || (path.startsWith("/documents/") && path !== "/documents/new") },
  { to: "/documents/new", label: "Add document", Icon: FilePlus2, match: (path) => path === "/documents/new" },
  { to: "/actors", label: "Actors", mobileLabel: "Actors", Icon: Code2, match: (path) => path === "/actors" },
  { to: "/tipline", label: "Tipline", mobileLabel: "Tips", Icon: Inbox, match: (path) => path === "/tipline" },
  { to: "/import", label: "Import", Icon: FolderInput, match: (path) => path === "/import" },
  { to: "/settings", label: "Settings", Icon: Settings, match: (path) => path === "/settings" },
  { to: "/about", label: "About", Icon: Info, match: (path) => path === "/about" }
]);
