export function formatShanghaiDateTime(input: string | number | Date) {
  const date = input instanceof Date ? input : new Date(input)
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date)
}

