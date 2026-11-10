import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Pick3Provider } from "@/components/pick3/store";
import AuthPage from "./pages/auth/Index";
import CheckPage from "./pages/check/Index";
import DrawsPage from "./pages/draws/Index";
import Index from "./pages/home/Index";
import NotFound from "./pages/not-found/Index";
import PicksPage from "./pages/picks/Index";
import TicketsPage from "./pages/tickets/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Pick3Provider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/check" element={<CheckPage />} />
            <Route path="/picks" element={<PicksPage />} />
            <Route path="/draws" element={<DrawsPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Pick3Provider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
