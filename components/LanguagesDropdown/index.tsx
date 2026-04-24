import { Languages } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

const LanguagesDropdown = () => {
  return (
    <div className="fixed z-10 top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" className="liquid-glass2">
            <Languages size={30} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            🇻🇳
          </DropdownMenuItem>
          <DropdownMenuItem>
            🇺🇸
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default LanguagesDropdown;