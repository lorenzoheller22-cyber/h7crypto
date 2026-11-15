
export const uploadMetadata = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      symbol: string;
      description: string;
      imageUrl?: string;
      imageBase64?: string;
      imageType?: string;
      twitter?: string;
      telegram?: string;
      website?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    let blob: Blob;

    if (data.imageBase64) {
      const bin = Uint8Array.from(
        atob(data.imageBase64),
        (c) => c.charCodeAt(0),
      );
      blob = new Blob([bin], {
        type: data.imageType || "image/png",
      });
    } else if (data.imageUrl) {
      const imageResponse = await fetch(data.imageUrl, {
        headers: { "user-agent": "Mozilla/5.0" },
      });

      if (!imageResponse.ok) {
        throw new Error("Não foi possível baixar a imagem original");
      }

      blob = await imageResponse.blob();
    } else {
      throw new Error("Imagem obrigatória");
    }

    // 1. Enviar imagem para armazenamento
    const formData = new FormData();
    formData.append("image", blob, "token-image.png");

    const imageResponse = await fetch(
      "https://nft-storage.letsbonk22.workers.dev/upload/img",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!imageResponse.ok) {
      throw new Error(
        `Falha ao enviar imagem (${imageResponse.status}): ${await imageResponse.text()}`,
      );
    }

    const imageUri = (await imageResponse.text()).trim();

    if (!imageUri.startsWith("http")) {
      throw new Error("O serviço não retornou um endereço válido para a imagem");
    }

    // 2. Enviar metadados
    const metadataResponse = await fetch(
      "https://nft-storage.letsbonk22.workers.dev/upload/meta",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          createdOn: "https://pump.fun",
          name: data.name,
          symbol: data.symbol,
          description: data.description,
          image: imageUri,
          twitter: data.twitter ?? "",
          telegram: data.telegram ?? "",
          website: data.website ?? "",
        }),
      },
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Falha ao enviar metadados (${metadataResponse.status}): ${await metadataResponse.text()}`,
      );
    }

    const metadataUri = (await metadataResponse.text()).trim();

    if (!metadataUri.startsWith("http")) {
      throw new Error("O serviço não retornou um endereço válido para os metadados");
    }

    return {
      uri: metadataUri,
      metadataUri,
      imageUri,
      name: data.name,
      symbol: data.symbol,
    };
  });
