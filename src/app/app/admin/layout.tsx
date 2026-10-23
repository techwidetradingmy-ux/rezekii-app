import { AdminViewMark } from "../../view-switch";

/** Admin pages: opening one puts this device in the admin dashboard, so its menus show (see AdminViewMark). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminViewMark />
      {children}
    </>
  );
}
