/** Message from any thrown value. ApiError messages are already written for customers. */
export const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
