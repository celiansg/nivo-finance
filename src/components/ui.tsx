import {
  Wallet,
  ShoppingBasket,
  Utensils,
  ShoppingBag,
  TrainFront,
  Fuel,
  House,
  Zap,
  Repeat,
  Ticket,
  Plane,
  Heart,
  Dumbbell,
  Laptop,
  Gift,
  BriefcaseBusiness,
  TrendingUp,
  PiggyBank,
  Shapes,
  Banknote,
  Music2,
  Play,
  Cloud,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Plus,
  Sun,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ChartNoAxesCombined,
  ChartPie,
  CalendarDays,
  Settings2,
  ShieldCheck,
  CircleCheck,
  X,
  Trash2,
  Search,
  Ellipsis,
  SlidersHorizontal,
  Download,
  Upload,
  LogOut,
  Landmark,
  Car,
  LockKeyhole,
  Menu,
  ChevronUp,
  ChevronDown,
  Pencil,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
const icons: Record<string, LucideIcon> = {
  Wallet,
  ShoppingBasket,
  Utensils,
  ShoppingBag,
  TrainFront,
  Fuel,
  House,
  Zap,
  Repeat,
  Ticket,
  Plane,
  Heart,
  Dumbbell,
  Laptop,
  Gift,
  BriefcaseBusiness,
  TrendingUp,
  PiggyBank,
  Shapes,
  Banknote,
  Music2,
  Play,
  Cloud,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Plus,
  Sun,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ChartNoAxesCombined,
  ChartPie,
  CalendarDays,
  Settings2,
  ShieldCheck,
  CircleCheck,
  X,
  Trash2,
  Search,
  Ellipsis,
  SlidersHorizontal,
  Download,
  Upload,
  LogOut,
  Landmark,
  Car,
  LockKeyhole,
  Menu,
  ChevronUp,
  ChevronDown,
  Pencil,
  Bell,
};
export function Icon({
  name = 'Wallet',
  size = 20,
  ...props
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const Comp = icons[name] ?? Wallet;
  return <Comp size={size} strokeWidth={1.7} {...props} />;
}
export function Badge({ icon = 'Wallet', color = '#0A84FF' }: { icon?: string; color?: string }) {
  return (
    <span className="icon-badge" style={{ color, background: `${color}18` }}>
      <Icon name={icon} />
    </span>
  );
}
export function GlassFilter() {
  return (
    <svg className="glass-filter-definition" aria-hidden="true">
      <defs>
        <filter
          id="glass-distortion"
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="1"
            seed="17"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.8" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="34"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
export function GlassLayers() {
  return (
    <>
      <span className="glass-layer glass-refraction" aria-hidden="true" />
      <span className="glass-layer glass-tint" aria-hidden="true" />
      <span className="glass-layer glass-shine" aria-hidden="true" />
    </>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const strongGlass = /(wealth-card|onboarding-card|budget-hero|living-card)/.test(className);
  return (
    <section className={`card ${strongGlass ? 'glass-surface' : ''} ${className}`}>
      {strongGlass && <GlassLayers />}
      {children}
    </section>
  );
}
export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        style={{
          width: `${Math.max(0, Math.min(value, 100))}%`,
          background: color ?? (value > 100 ? '#DE7783' : value > 85 ? '#D9A353' : '#7C3AED'),
        }}
      />
    </div>
  );
}
export function Empty({
  text = 'Aucun élément pour le moment.',
  action,
}: {
  text?: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <Icon name="Sparkles" size={28} />
      <p>{text}</p>
      {action && (
        <button className="button" onClick={action}>
          Ajouter le premier élément
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <GlassLayers />
      <div className="modal-inner">
        <div className="section-title">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            <Icon name="X" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
