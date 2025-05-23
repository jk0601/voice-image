import { LucideProps } from 'lucide-react'

export const Icons = {
  logo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 멋진 J 이니셜 */}
      <path d="M12 3v13c0 2.5-2 4-4 4s-4-1.5-4-4" strokeWidth="2.5" />
      <path d="M12 3h2" strokeWidth="2.5" />
      <path d="M8 20h4" strokeWidth="2.5" />
      <path d="M4 13l2 1" strokeWidth="1.5" strokeDasharray="1,1" />
      <path d="M14 3l1 2" strokeWidth="1.5" strokeDasharray="1,1" />
    </svg>
  ),
} 