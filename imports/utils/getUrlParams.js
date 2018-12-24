const getUrlParams = url => {
  const params = url.replace('?', '').split('&').reduce(
    (prev, e) => {
      const splitted = e.split('=');
      prev[decodeURIComponent(splitted[0])] = decodeURIComponent(splitted[1]);
      return prev;
    },
    {}
  );
  return params;
};

export default getUrlParams;