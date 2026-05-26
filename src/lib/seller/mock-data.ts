// Realistic mock data for the seller dashboard. Swap with Supabase later.

export const revenueSeries = [
  { d: "Mon", v: 420 },
  { d: "Tue", v: 680 },
  { d: "Wed", v: 520 },
  { d: "Thu", v: 910 },
  { d: "Fri", v: 1240 },
  { d: "Sat", v: 980 },
  { d: "Sun", v: 1430 },
];

export const ordersSeries = [
  { d: "W1", v: 18 },
  { d: "W2", v: 26 },
  { d: "W3", v: 22 },
  { d: "W4", v: 34 },
  { d: "W5", v: 41 },
  { d: "W6", v: 38 },
  { d: "W7", v: 52 },
];

export const conversionSeries = [
  { d: "Jan", v: 2.1 },
  { d: "Feb", v: 2.4 },
  { d: "Mar", v: 2.9 },
  { d: "Apr", v: 3.3 },
  { d: "May", v: 3.0 },
  { d: "Jun", v: 3.8 },
];

export const categoryShare = [
  { name: "Game Accounts", v: 48 },
  { name: "Gift Cards", v: 22 },
  { name: "Currency", v: 18 },
  { name: "Boosting", v: 12 },
];

export const recentOrders = [
  {
    id: "HX-29481",
    buyer: "rylan_47",
    item: "Valorant Immortal Acc.",
    amount: 124.0,
    status: "Delivered",
    time: "2m ago",
  },
  {
    id: "HX-29478",
    buyer: "ngao",
    item: "PUBG UC 8100",
    amount: 78.5,
    status: "Processing",
    time: "14m ago",
  },
  {
    id: "HX-29470",
    buyer: "kira_x",
    item: "Steam Wallet $50",
    amount: 47.0,
    status: "Delivered",
    time: "1h ago",
  },
  {
    id: "HX-29465",
    buyer: "tom_w",
    item: "FIFA Coins 4M",
    amount: 38.9,
    status: "Disputed",
    time: "3h ago",
  },
  {
    id: "HX-29460",
    buyer: "ahmed",
    item: "Genshin Top-Up",
    amount: 22.0,
    status: "Delivered",
    time: "6h ago",
  },
];

export const listings = [
  {
    id: 1,
    title: "Valorant Immortal | All Agents",
    sku: "VAL-IM-001",
    price: 124,
    stock: 4,
    status: "Active",
    views: 2104,
    sales: 18,
  },
  {
    id: 2,
    title: "PUBG UC 8100 - Global",
    sku: "PUBG-8100",
    price: 78.5,
    stock: 99,
    status: "Active",
    views: 5421,
    sales: 64,
  },
  {
    id: 3,
    title: "Steam Wallet Code $50 USD",
    sku: "STM-50",
    price: 47,
    stock: 220,
    status: "Active",
    views: 8910,
    sales: 142,
  },
  {
    id: 4,
    title: "FIFA Ultimate Coins 4M PS5",
    sku: "FIFA-4M",
    price: 38.9,
    stock: 12,
    status: "Paused",
    views: 980,
    sales: 6,
  },
  {
    id: 5,
    title: "Genshin Impact Top-Up 6480",
    sku: "GEN-6480",
    price: 99,
    stock: 50,
    status: "Active",
    views: 3420,
    sales: 31,
  },
];

export const reviews = [
  {
    id: 1,
    buyer: "rylan_47",
    rating: 5,
    text: "Instant delivery, exactly as described. Will buy again!",
    time: "2 days ago",
  },
  {
    id: 2,
    buyer: "ngao",
    rating: 5,
    text: "Smooth transaction and very responsive seller.",
    time: "5 days ago",
  },
  {
    id: 3,
    buyer: "kira_x",
    rating: 4,
    text: "Took a few mins but everything worked.",
    time: "1 week ago",
  },
];

export const conversations = [
  { id: 1, user: "rylan_47", preview: "Hey, can you deliver tonight?", unread: 2, time: "2m" },
  { id: 2, user: "ngao", preview: "Thanks bro, account works!", unread: 0, time: "1h" },
  { id: 3, user: "ahmed", preview: "Do you accept Razorpay?", unread: 1, time: "5h" },
];

export const transactions = [
  { id: "TXN-9821", type: "Sale", amount: 124.0, fee: -2.36, net: 121.64, date: "2026-05-19" },
  { id: "TXN-9819", type: "Sale", amount: 78.5, fee: -1.49, net: 77.01, date: "2026-05-19" },
  { id: "TXN-9810", type: "Withdrawal", amount: -500, fee: 0, net: -500, date: "2026-05-17" },
  { id: "TXN-9802", type: "Sale", amount: 47.0, fee: -0.89, net: 46.11, date: "2026-05-16" },
  { id: "TXN-9790", type: "Refund", amount: -38.9, fee: 0, net: -38.9, date: "2026-05-14" },
];

export const withdrawals = [
  { id: "WD-318", amount: 500, method: "Razorpay UPI", status: "Completed", date: "2026-05-17" },
  { id: "WD-302", amount: 1200, method: "Bank Transfer", status: "Completed", date: "2026-05-02" },
  { id: "WD-294", amount: 350, method: "PayPal", status: "Pending", date: "2026-05-20" },
];

export const notifications = [
  {
    id: 1,
    kind: "order",
    title: "New order HX-29481",
    body: "Buyer rylan_47 purchased Valorant Immortal.",
    time: "2m ago",
    read: false,
  },
  {
    id: 2,
    kind: "review",
    title: "New 5★ review",
    body: "rylan_47 left a glowing review.",
    time: "2h ago",
    read: false,
  },
  {
    id: 3,
    kind: "system",
    title: "Payout processed",
    body: "$500 sent to your bank account.",
    time: "1d ago",
    read: true,
  },
];

export const disputes = [
  {
    id: "DIS-118",
    order: "HX-29465",
    buyer: "tom_w",
    reason: "Item not as described",
    status: "Open",
    opened: "3h ago",
  },
];

export const coupons = [
  { code: "WELCOME10", discount: "10%", uses: 124, status: "Active", expires: "2026-06-30" },
  { code: "SUMMER25", discount: "25%", uses: 38, status: "Active", expires: "2026-08-15" },
];
