export const healthcheck = async (req, res) => {
  try {
    console.log(req.user)
    return res.status(200).json({ msg: "Healthcheck passed" });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return res
      .status(500)
      .json({ msg: "Healthcheck failed", error: error.message });
  }
};