import { Search } from "lucide-react";
import { useState } from "react";

interface FloatingSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const FloatingSearch = ({ onSearch, placeholder = "ابحث في جيرتك..." }: FloatingSearchProps) => {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pr-12 pl-4 rounded-2xl glass-strong text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-soft-md"
        />
      </div>
    </div>
  );
};
