import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { motion } from "framer-motion";
import { Link2, Settings, TrendingUp, Upload, Users, Rocket, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    step: 1,
    icon: Upload,
    title: "Sign Up & Set Up",
    description: "Create your account in 60 seconds. Customize your workspace, add your branding, and invite your team.",
    details: [
      "Quick onboarding wizard",
      "Import existing projects and clients",
      "Customize workflows to match your process",
    ],
  },
  {
    step: 2,
    icon: Link2,
    title: "Connect Your Tools",
    description: "Integrate with the tools you already use. Connect Slack, Google Drive, Figma, and 100+ other platforms.",
    details: [
      "One-click integrations",
      "Sync data automatically",
      "Keep using your favorite tools",
    ],
  },
  {
    step: 3,
    icon: Users,
    title: "Invite Clients",
    description: "Add your clients to branded portals where they can view progress, approve work, and communicate with your team.",
    details: [
      "White-labeled client portals",
      "Custom access permissions",
      "Automated notifications",
    ],
  },
  {
    step: 4,
    icon: Settings,
    title: "Automate Workflows",
    description: "Build custom workflows for briefs, approvals, reporting, and more. Let automation handle the repetitive tasks.",
    details: [
      "Visual workflow builder",
      "Pre-built templates",
      "Trigger actions automatically",
    ],
  },
  {
    step: 5,
    icon: Rocket,
    title: "Execute Projects",
    description: "Manage tasks, track time, collaborate with your team, and deliver exceptional work faster than ever.",
    details: [
      "Real-time collaboration",
      "Task management",
      "Time tracking",
    ],
  },
  {
    step: 6,
    icon: TrendingUp,
    title: "Track & Optimize",
    description: "Monitor KPIs, generate reports, and use AI insights to continuously improve your agency operations.",
    details: [
      "Beautiful analytics dashboards",
      "Automated client reporting",
      "AI-powered recommendations",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-20 bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/50 dark:from-gray-950 dark:via-cyan-950/20 dark:to-blue-950/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Get Started in
              <br />
              <span className="bg-gradient-to-r from-[#00C2C2] to-[#1BE7FF] bg-clip-text text-transparent">
                6 Simple Steps
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            >
              From setup to success, we'll guide you every step of the way
            </motion.p>
          </div>
        </section>

        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {steps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
                          <item.icon className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border-2 border-cyan-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-cyan-500">{item.step}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {item.title}
                      </h3>
                      <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                        {item.description}
                      </p>
                      <ul className="space-y-2">
                        {item.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute left-10 top-20 w-0.5 h-16 bg-gradient-to-b from-cyan-500 to-blue-500" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Join hundreds of agencies already growing with AgencyFlow
            </p>
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#00C2C2] to-[#1BE7FF] text-white rounded-lg font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:scale-105"
            >
              Start Your Free Trial
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
