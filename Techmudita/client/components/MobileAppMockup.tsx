export const MobileAppMockup = () => {
  return (
    <div className="flex justify-center items-center">
      {/* Phone Frame */}
      <div className="relative w-72 h-auto">
        {/* Phone Body */}
        <div className=" rounded-3xl p-3 ">
          {/* Phone Screen */}
          <div className="rounded-3xl  aspect-[9.5/20]">
            <img
              src="/mobile.png"
              alt="MyStayInn Onboarding - Welcome to MyStayInn"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Floating Shadow */}
        <div className="absolute inset-0 -z-10 bg-accent/20 blur-2xl rounded-3xl" />
      </div>
    </div>
  );
};
