const getFullDay = date => {
  const start = date;
  start.setHours(0, 0, 0, 0);

  const end = date;
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export default getFullDay;