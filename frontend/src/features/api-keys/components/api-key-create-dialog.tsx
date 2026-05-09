import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ExpiryPicker } from "@/features/api-keys/components/expiry-picker";
import { LimitRulesEditor } from "@/features/api-keys/components/limit-rules-editor";
import { ModelMultiSelect } from "@/features/api-keys/components/model-multi-select";
import type { ApiKeyCreateRequest, LimitRuleCreate, ServiceTierType } from "@/features/api-keys/schemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export type ApiKeyCreateDialogProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiKeyCreateRequest) => Promise<void>;
};

export function ApiKeyCreateDialog({ open, busy, onOpenChange, onSubmit }: ApiKeyCreateDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [limitRules, setLimitRules] = useState<LimitRuleCreate[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [enforcedModel, setEnforcedModel] = useState("");
  const [enforcedReasoningEffort, setEnforcedReasoningEffort] = useState("none");
  const [enforcedServiceTier, setEnforcedServiceTier] = useState("none");

  const handleSubmit = async (values: FormValues) => {
    const validLimits = limitRules.filter((r) => r.maxValue > 0);
    const payload: ApiKeyCreateRequest = {
      name: values.name,
      allowedModels: selectedModels.length > 0 ? selectedModels : undefined,
      enforcedModel: enforcedModel.trim() ? enforcedModel.trim() : null,
      enforcedReasoningEffort: enforcedReasoningEffort === "none" ? null : enforcedReasoningEffort as "minimal" | "low" | "medium" | "high" | "xhigh",
      enforcedServiceTier: enforcedServiceTier === "none" ? null : enforcedServiceTier as ServiceTierType,
      expiresAt: expiresAt?.toISOString(),
      limits: validLimits.length > 0 ? validLimits : undefined,
    };
    try {
      await onSubmit(payload);
    } catch {
      return;
    }
    form.reset();
    setSelectedModels([]);
    setLimitRules([]);
    setExpiresAt(null);
    setEnforcedModel("");
    setEnforcedReasoningEffort("none");
    setEnforcedServiceTier("none");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>Set restrictions and expiration for this key.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {/* Left column — General */}
              <div className="max-h-[55vh] space-y-4 overflow-y-auto overscroll-contain pr-2 pb-2">
                <h4 className="sticky top-0 z-10 bg-background/95 pb-2 pt-1 backdrop-blur-sm text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/80">General</h4>
                
                <div className="space-y-4 rounded-xl border border-border/40 bg-card/30 p-4 shadow-sm">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="off" className="h-9 bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Allowed models</label>
                    <ModelMultiSelect value={selectedModels} onChange={setSelectedModels} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced model</label>
                    <Input
                      value={enforcedModel}
                      onChange={(e) => setEnforcedModel(e.target.value)}
                      placeholder="e.g. gpt-5.3-codex"
                      autoComplete="off"
                      className="h-9 bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced reasoning</label>
                      <Select value={enforcedReasoningEffort} onValueChange={setEnforcedReasoningEffort}>
                        <SelectTrigger className="h-9 bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40 shadow-md">
                          <SelectItem value="none" className="rounded-lg">None</SelectItem>
                          <SelectItem value="minimal" className="rounded-lg">Minimal</SelectItem>
                          <SelectItem value="low" className="rounded-lg">Low</SelectItem>
                          <SelectItem value="medium" className="rounded-lg">Medium</SelectItem>
                          <SelectItem value="high" className="rounded-lg">High</SelectItem>
                          <SelectItem value="xhigh" className="rounded-lg">XHigh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced tier</label>
                      <Select value={enforcedServiceTier} onValueChange={setEnforcedServiceTier}>
                        <SelectTrigger className="h-9 bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40 shadow-md">
                          <SelectItem value="none" className="rounded-lg">None</SelectItem>
                          <SelectItem value="auto" className="rounded-lg">Auto</SelectItem>
                          <SelectItem value="default" className="rounded-lg">Default</SelectItem>
                          <SelectItem value="priority" className="rounded-lg">Priority</SelectItem>
                          <SelectItem value="flex" className="rounded-lg">Flex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</label>
                    <ExpiryPicker value={expiresAt} onChange={setExpiresAt} />
                  </div>
                </div>
              </div>

              {/* Right column — Limits */}
              <div className="max-h-[55vh] space-y-4 overflow-y-auto overscroll-contain pr-2 pb-2 max-sm:mt-3 max-sm:border-t max-sm:pt-3">
                <h4 className="sticky top-0 z-10 bg-background/95 pb-2 pt-1 backdrop-blur-sm text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/80">Limits</h4>
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 shadow-sm">
                  <LimitRulesEditor rules={limitRules} onChange={setLimitRules} />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={busy || form.formState.isSubmitting}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
