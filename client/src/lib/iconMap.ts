import {
  Zap, Shield, Clock, Users, Star, Heart, Trophy, Target, Globe, Lock,
  Key, Cpu, Layers, Gift, Tag, Truck, CheckCircle, Award, Headphones,
  Smartphone, Wifi, CreditCard, Wallet, MessageCircle, Sparkles, Flame,
  Crown, ThumbsUp, Rocket, Medal, BarChart2, TrendingUp, Gem, Swords,
  Gamepad2, type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Zap, Shield, Clock, Users, Star, Heart, Trophy, Target, Globe, Lock,
  Key, Cpu, Layers, Gift, Tag, Truck, CheckCircle, Award, Headphones,
  Smartphone, Wifi, CreditCard, Wallet, MessageCircle, Sparkles, Flame,
  Crown, ThumbsUp, Rocket, Medal, BarChart2, TrendingUp, Gem, Swords,
  Gamepad2,
};

export const ICON_LIST = Object.keys(ICON_MAP);

export const DEFAULT_VALUE_CARDS = [
  { icon: "Zap",        title: "Instant Delivery",  desc: "Top-ups are credited to your account within seconds of payment confirmation." },
  { icon: "Shield",     title: "Secure & Trusted",  desc: "All transactions are encrypted end-to-end and processed by PCI-compliant gateways." },
  { icon: "Clock",      title: "24/7 Support",       desc: "Our support team is available around the clock to resolve any issue you may face." },
  { icon: "Users",      title: "Community First",    desc: "Built by gamers for gamers — we understand what matters to you." },
];
