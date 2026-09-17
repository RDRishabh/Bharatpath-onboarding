export async function requestMoreSeats(
  additionalSeats: number,
): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, 600),
  );

  console.log(
    `Requested ${additionalSeats} additional seats`,
  );
}

export async function downloadQuote(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, 300),
  );

  console.log("Downloading quote");
}