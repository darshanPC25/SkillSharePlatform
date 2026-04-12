import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Zap, Shield, Users, ArrowRight, Code, Video, Globe2, BookOpen } from 'lucide-react';

export function Home() {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacityText = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Background ambient glow setup globally, but we can add parallax elements here */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 z-[-1] pointer-events-none">
        <div className="w-[1px] h-[200vh] bg-gradient-to-b from-transparent via-[#ea580c] to-transparent absolute left-[15%] opacity-20 -top-[50vh] animate-[scanline_12s_linear_infinite]" />
        <div className="w-[1px] h-[200vh] bg-gradient-to-b from-transparent via-[#c2410c] to-transparent absolute right-[25%] opacity-10 -top-[50vh] animate-[scanline_15s_linear_infinite_reverse]" />
      </motion.div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 pt-12 pb-20 lg:pt-20 lg:pb-32 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ opacity: opacityText }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#ea580c]/30 text-[#ea580c] bg-[#ea580c]/5 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></span>
            SYSTEM ONLINE // V2.0 
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-display text-white mb-6 tracking-tight leading-tight">
            Exchange Knowledge at <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ea580c] to-red-600">Neural Speed</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-12 leading-relaxed">
            Connect with experts. Swap skills through high-bandwidth WebRTC video interfaces. Accelerate your learning exponentially.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" className="h-14 px-8 text-lg w-full sm:w-auto">
                Initialize Connect <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/browse">
              <Button variant="neural" className="h-14 px-8 text-lg w-full sm:w-auto">
                Browse Network
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "Low-Latency Video",
              desc: "Peer-to-peer WebRTC connections bypass standard server lag for instantaneous audiovisual learning."
            },
            {
              icon: Shield,
              title: "Verified Nodes",
              desc: "Cryptographically backed reputation algorithms ensure you're connecting with legitimate experts."
            },
            {
              icon: Users,
              title: "Global Mesh",
              desc: "Tap into a worldwide grid of developers, designers, and engineers ready to swap disciplines."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
            >
              <GlassCard hover className="p-8 h-full flex flex-col items-start text-left">
                <div className="w-12 h-12 rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-[#ea580c]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works Pipeline */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">The Swap <span className="text-[#ea580c]">Protocol</span></h2>
          <p className="text-gray-400 max-w-xl mx-auto">Three automated steps to bypass traditional learning silos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ea580c]/50 to-transparent shadow-[0_0_15px_rgba(234,88,12,0.5)]" />
          
          {[
            { step: '01', title: 'Initialize Node', desc: 'Create your digital profile. Declare what systems you know, and what systems you demand to learn.' },
            { step: '02', title: 'Algorithmic Pairing', desc: 'The Grid scans the global matrix and pairs you with identical symmetric matches inversely proportional to your skills.' },
            { step: '03', title: 'P2P Uplink', desc: 'Engage in a localized WebRTC multi-mesh session. Swap knowledge live through encrypted video arrays.' }
          ].map((item, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border-2 border-[#ea580c] flex items-center justify-center text-2xl font-bold font-display text-[#ea580c] mb-6 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(234,88,12,0.3)]">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Disciplines Matrix */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 border-t border-white/5 bg-[#ea580c]/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">Active <span className="text-[#ea580c]">Sectors</span></h2>
          <p className="text-gray-400 max-w-xl mx-auto">The most highly-demanded nodes in the global exchange.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {[
            { icon: Code, name: 'Full-Stack Engineering' },
            { icon: Globe2, name: 'Web3 & Blockchain' },
            { icon: Zap, name: 'Generative AI' },
            { icon: Video, name: 'Video Manipulation' },
            { icon: BookOpen, name: 'Neural Design Patterns' },
            { icon: Shield, name: 'Cybersecurity' }
          ].map((cat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="px-6 py-3 rounded-full border border-white/10 bg-black/40 text-gray-300 font-medium flex items-center gap-3 hover:bg-[#ea580c]/10 hover:border-[#ea580c]/50 hover:text-white transition-all cursor-pointer shadow-lg"
            >
              <cat.icon className="w-4 h-4 text-[#ea580c]" />
              {cat.name}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Terminal CTA */}
      <section className="relative z-10 max-w-[1000px] mx-auto px-6 py-24 text-center">
        <GlassCard className="p-12 md:p-16 border-[#ea580c]/30 shadow-[0_0_50px_rgba(234,88,12,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ea580c] to-transparent"></div>
          <h2 className="text-4xl font-display font-bold text-white mb-6">Ready to upload yourself?</h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The Grid is waiting. Tap into the decentralized knowledge matrix today and redefine human learning velocity natively in your browser.
          </p>
          <Link to="/register">
            <Button variant="primary" className="h-14 px-10 text-lg w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform duration-300">
              Access The Grid <Zap className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}
