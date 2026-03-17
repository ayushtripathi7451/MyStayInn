import { User, Bell } from "lucide-react";

export default function RightSidebar() {
  return (
<div className="bg-white border-l border-gray-200 p-5 h-full lg:h-[95vh] flex flex-col justify-between sticky top-4">

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 mb-5">
          Notifications
        </h3>

        <div className="space-y-5 text-[13px]">
          {[
            "Just now",
            "59 minutes ago",
            "12 hours ago",
            "Today, 11:59 AM",
          ].map((time, i) => (
            <div key={i} className="flex items-start gap-3">
              
              {/* ICON */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                {i === 1 ? (
                  <User size={14} className="text-gray-500" />
                ) : (
                  <Bell size={14} className="text-gray-500" />
                )}
              </div>

              {/* TEXT */}
              <div className="leading-tight">
                <p className="text-gray-900">
                  New user registered.
                </p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  {time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#FAFAFA] max-w rounded-xl p-4 mt-8 border border-gray-100">
        <h3 className="text-[14px] font-semibold text-gray-900 mb-4 leading-tight">
          Enrollment Status <br />
          <span className="font-normal">Overview</span>
        </h3>

        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Pending Requests</span>
            <span className="font-medium text-gray-900">421</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Accepted</span>
            <span className="font-medium text-gray-900">1089</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Rejected</span>
            <span className="font-medium text-gray-900">124</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Completed</span>
            <span className="font-medium text-gray-900">178</span>
          </div>
        </div>
      </div>

    </div>
  );
}
