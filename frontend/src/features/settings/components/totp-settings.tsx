import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AlertMessage } from "@/components/alert-message";
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
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import {
  confirmTotpSetup,
  disableTotp,
  startTotpSetup,
} from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/hooks/use-auth";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import type { DashboardSettings, SettingsUpdateRequest } from "@/features/settings/schemas";
import { getErrorMessage } from "@/utils/errors";

const totpCodeSchema = z.object({
  code: z.string().length(6, "Enter a 6-digit code"),
});

type TotpCodeValues = z.infer<typeof totpCodeSchema>;
type TotpDialog = "setup" | "disable" | null;

export type TotpSettingsProps = {
  settings: DashboardSettings;
  disabled?: boolean;
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
};

export function TotpSettings({ settings, disabled = false, onSave }: TotpSettingsProps) {
  const queryClient = useQueryClient();
  const refreshSession = useAuthStore((state) => state.refreshSession);

  const [activeDialog, setActiveDialog] = useState<TotpDialog>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQrDataUri, setSetupQrDataUri] = useState<string | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmForm = useForm<TotpCodeValues>({
    resolver: zodResolver(totpCodeSchema),
    defaultValues: { code: "" },
  });

  const disableForm = useForm<TotpCodeValues>({
    resolver: zodResolver(totpCodeSchema),
    defaultValues: { code: "" },
  });

  const lock = disabled || prefetching || confirmForm.formState.isSubmitting || disableForm.formState.isSubmitting;

  const closeDialog = () => {
    setActiveDialog(null);
    setError(null);
    setSetupSecret(null);
    setSetupQrDataUri(null);
    confirmForm.reset();
    disableForm.reset();
  };

  const handleOpenSetup = async () => {
    setActiveDialog("setup");
    setPrefetching(true);
    setError(null);
    try {
      const response = await startTotpSetup();
      setSetupSecret(response.secret);
      setSetupQrDataUri(response.qrSvgDataUri);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPrefetching(false);
    }
  };

  const handleConfirmSetup = async (values: TotpCodeValues) => {
    if (!setupSecret) return;
    setError(null);
    try {
      await confirmTotpSetup({ secret: setupSecret, code: values.code });
      await refreshSession();
      void queryClient.invalidateQueries({ queryKey: ["settings", "detail"] });
      toast.success("TOTP configured");
      closeDialog();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const handleDisable = async (values: TotpCodeValues) => {
    setError(null);
    try {
      await disableTotp({ code: values.code });
      await refreshSession();
      void queryClient.invalidateQueries({ queryKey: ["settings", "detail"] });
      toast.success("TOTP disabled");
      closeDialog();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
      <div className="space-y-4">
        {/* Status row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">TOTP</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings.totpConfigured ? "TOTP is configured." : "No TOTP configured."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-1">
            {settings.totpConfigured ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                disabled={lock}
                onClick={() => setActiveDialog("disable")}
              >
                Disable
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={lock}
                onClick={handleOpenSetup}
              >
                Enable TOTP
              </Button>
            )}
          </div>
        </div>

        {/* Require on login toggle */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner">
          <div>
            <p className="text-sm font-medium">Require TOTP on login</p>
            <p className="text-[11px] text-muted-foreground">Prompt for TOTP code after password login.</p>
          </div>
          <Switch
            checked={settings.totpRequiredOnLogin}
            disabled={lock}
            onCheckedChange={(checked) =>
              void onSave(buildSettingsUpdateRequest(settings, { totpRequiredOnLogin: checked }))
            }
          />
        </div>
      </div>

      {/* Setup dialog */}
      <Dialog open={activeDialog === "setup"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enable TOTP</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the verification code.
            </DialogDescription>
          </DialogHeader>
          {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}

          {setupQrDataUri ? (
            <div className="flex justify-center rounded-lg border bg-card p-4 dark:bg-white/95">
              <img src={setupQrDataUri} alt="TOTP QR code" className="h-40 w-40" />
            </div>
          ) : null}

          {setupSecret ? (
            <p className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs">
              Secret: {setupSecret}
            </p>
          ) : null}

          {setupSecret ? (
            <Form {...confirmForm}>
              <form onSubmit={confirmForm.handleSubmit(handleConfirmSetup)} className="space-y-4">
                <FormField
                  control={confirmForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center gap-2">
                      <FormLabel className="sr-only">Verification code</FormLabel>
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog} disabled={prefetching}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={lock}>
                    Confirm setup
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={activeDialog === "disable"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable TOTP</DialogTitle>
            <DialogDescription>Enter your current TOTP code to disable two-factor authentication.</DialogDescription>
          </DialogHeader>
          {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}
          <Form {...disableForm}>
            <form onSubmit={disableForm.handleSubmit(handleDisable)} className="space-y-4">
              <FormField
                control={disableForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormLabel className="sr-only">TOTP code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={lock}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={lock}>
                  Disable TOTP
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
