export const formatFilename = (filename: string) => {
  const formatedFilename = filename?.split("_").slice(1).join("_");
  return formatedFilename;
};
