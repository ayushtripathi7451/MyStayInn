import StatsCard from "./StatsCard";
import Navbar from "./Navbar";
import RevenueChart from "./RevenueChart";
import BedChart from "./BedChart";
import OccupancyChart from "./OccupancyChart";
import RightSidebar from "./RightSidebar";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] lg:ml-56 h-screen overflow-hidden">
        
        <div className="overflow-y-auto px-4 lg:px-0 pr-0 lg:pr-4 no-scrollbar">
          <Navbar />

          <div className="gap-6">
            <div className="w-auto space-y-6">

              <h2 className="text-lg font-semibold text-gray-900">
                Overview
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatsCard title="Active Admins" colour="#EEF0FF" value="7,265" growth="+11.01%" />
                <StatsCard title="Active Customers" colour="#ECF4FF" value="3,671" growth="-0.03%" />
                <StatsCard title="Revenue per Admin" colour="#EEF0FF" value="156" growth="+15.03%" />
                <StatsCard title="Revenue per Admin" colour="#ECF4FF" value="2,318" growth="+6.08%" />
              </div>

              <RevenueChart />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                <BedChart />
                <OccupancyChart />
              </div>

            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <RightSidebar />
        </div>

      </div>

      <div className="block lg:hidden px-4 pb-6">
        <RightSidebar />
      </div>

    </div>
  );
}

