package com.bolaonacopa.app;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

    @PluginMethod()
    public void share(PluginCall call) {
        String fileUri = call.getString("fileUri");
        String text = call.getString("text", "");

        if (fileUri == null || fileUri.isEmpty()) {
            call.reject("fileUri is required");
            return;
        }

        try {
            // Converter o URI do Capacitor para um File
            Uri uri = Uri.parse(fileUri);
            File file = new File(uri.getPath());

            if (!file.exists()) {
                call.reject("File not found: " + fileUri);
                return;
            }

            // Gerar content URI via FileProvider
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/png");
            intent.putExtra(Intent.EXTRA_STREAM, contentUri);
            if (text != null && !text.isEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, text);
            }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // Tentar abrir WhatsApp direto
            intent.setPackage("com.whatsapp");

            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (android.content.ActivityNotFoundException e) {
                // WhatsApp não instalado — fallback para share sheet
                intent.setPackage(null);
                getActivity().startActivity(Intent.createChooser(intent, "Compartilhar"));
                call.resolve();
            }
        } catch (Exception e) {
            call.reject("Error sharing: " + e.getMessage());
        }
    }
}
