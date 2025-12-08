const supabase = window.supabaseClient;

async function loadProducts() {
    const { data, error } = await supabase
        .from("products")
        .select(`
            id,
            name,
            spec,
            unit,
            last_price,
            updated_at,
            product_images ( url )
        `);

    if (error) {
        console.error(error);
        return;
    }

    renderProducts(data);
}
