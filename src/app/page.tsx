const Page = () => {
  return (
    <>
      <div className="mt-4 sm:mt-6 w-full flex flex-col justify-start items-center">
        <img className="w-48 h-auto" src="/graphy.png" alt="graphy" />
      </div>
      <div className="w-full flex flex-col justify-center items-center sm:px-16">
        <h2 className="w-full text-center text-3xl sm:text-5xl font-medium sm:font-bold mt-4 mb-6">GitHub Contributors Graphy</h2>
        <h3 className="w-full text-base sm:text-xl text-gray-500 text-center">An open source GitHub contribution graph generator.</h3>
      </div>
    </>
  );
};

export default Page;
