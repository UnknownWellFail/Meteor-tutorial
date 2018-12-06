const setMidnight = date => {
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDaysToCurrDate = days => {
  const date = setMidnight(new Date() );
  date.setDate(date.getDate() + days);
  return date;
};

const clearLine = text => {
  for (const comp of textComponents) {
    text = text.replace(comp, '');
  }
  text = text.replace(/\s/g, '');
  return text;
};
const textComponents = [
  'в', 'на', 'к', 'с'
];

const dateWords = [
  { text: 'завтра', date: { start: addDaysToCurrDate(1), end: addDaysToCurrDate(2) } },
  { text: 'сегодня', date: { start: setMidnight(new Date() ), end: addDaysToCurrDate(1) } }
];

const timeRegex = [
  /\d{2}[:]\d{2}/,
  /\d{1}[:]\d{2}/
];

const findWordTime = text => {
  for (const word of dateWords) {
    if (text.match(word.text) !== null) {
      return { text: text.replace(word.text, ''), date: word.date };
    }
  }
  return null;
};

const findTime = text => {
  let timeArr = null;
  let time = null;

  for (const regex of timeRegex) {
    timeArr = text.match(regex);
    if (timeArr !== null && timeArr.lenght !== 0) {
      time = timeArr[0];
      break;
    }
  }
  if (time === null){
    return null;
  }

  const hours = time.split(':')[0];
  const minutes = time.split(':')[1];
  const date = new Date();

  date.setHours(hours, minutes);

  return { text: text.replace(time, ''), date: date };
};

export default findDate = text => {
  const day = findWordTime(text);
  const time = day === null ? findTime(text) : findTime(day.text) ;

  let date = null;

  if (day !== null) {
    date = { text: day.text, date: day.date };
    if (time !== null) {
      date.date.start.setHours(time.date.getHours(), time.date.getMinutes() );
      date.date.end = date.date.start;

      date.date.end.setHours(time.date.getHours(), time.date.getMinutes() );
      date.text = time.text;
    }
  } else if (time !== null) {
    date = { text: time.text, date: { start: new Date(), end: new Date() } };
    date.date.start.setHours(time.date.getHours(), time.date.getMinutes() );
    date.date.end.setHours(time.date.getHours(), time.date.getMinutes() );
  }

  if (date !== null) {
    date.text = clearLine(date.text);
  }
  return date;
};