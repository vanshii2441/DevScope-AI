import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-purple-600/30 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10">
        <SignIn appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0a0a0a] border border-white/10 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-zinc-400",
            socialButtonsBlockButton: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
            socialButtonsBlockButtonText: "text-white font-medium",
            socialButtonsProviderIcon: "filter invert",
            dividerLine: "bg-white/10",
            dividerText: "text-zinc-500",
            formFieldLabel: "text-zinc-300",
            formFieldInput: "bg-white/5 border border-white/10 text-white focus:ring-purple-500 focus:border-transparent",
            formButtonPrimary: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white",
            footerActionText: "text-zinc-400",
            footerActionLink: "text-purple-400 hover:text-purple-300"
          }
        }} />
      </div>
    </div>
  );
}
