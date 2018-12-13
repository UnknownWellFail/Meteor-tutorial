const getAllDay = date => {
  const currentDate = date ? date : new Date();
  const start = currentDate;
  start.setHours(0, 0, 0, 0);

  const end = currentDate;
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export default getAllDay;