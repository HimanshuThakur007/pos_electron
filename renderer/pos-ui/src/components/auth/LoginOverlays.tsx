export function CheckingLicenseOverlay() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h4 className="font-bold text-gray-900 text-xl mb-2">
        Checking License...
      </h4>
      <p className="text-gray-500">
        Please wait while we verify your terminal.
      </p>
    </div>
  );
}

export function LoadingOverlay({
  progress,
  loadingMsg,
}: {
  progress: number;
  loadingMsg: string;
}) {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="w-80 mb-6">
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold text-blue-600">{progress}%</span>
        </div>
      </div>
      <h4 className="font-bold text-gray-900 text-xl mb-2">{loadingMsg}</h4>
      <p className="text-gray-500">
        Please wait while we set up your terminal.
      </p>
    </div>
  );
}
