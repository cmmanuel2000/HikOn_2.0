# Use the official Edge Impulse inference container
FROM public.ecr.aws/g7a8t7v6/inference-container:v1.92.3

# 1. Expose the port Hugging Face expects (7860)
EXPOSE 7860

# 2. Update the CMD to use 7860 instead of 1337
# Using the user's new API key
CMD ["--api-key", "ei_e666427788a29947db107ba6c39f4f42591a3a44b20ae39827e2c500ddb1b40f", "--run-http-server", "7860", "--force-variant", "float32"]
