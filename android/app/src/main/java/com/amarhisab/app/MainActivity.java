package com.amarhisab.app;

import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        
        // Disable translucent flags so status bar is solid and never covers content
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        // 1. Pure White Status Bar (like Facebook / Modern Apps)
        window.setStatusBarColor(0xFFFFFFFF);

        // 2. CRUCIAL: setAppearanceLightStatusBars(true) makes the clock, battery, wifi icons DARK/BLACK
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
        }

        // 3. Navigation Bar (Bottom) Pure White with dark buttons
        window.setNavigationBarColor(0xFFFFFFFF);
        if (controller != null) {
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
