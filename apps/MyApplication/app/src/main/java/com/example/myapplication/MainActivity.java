package com.example.myapplication;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Date;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        View button = findViewById(R.id.button_action);
        final TextView result = (TextView) findViewById(R.id.text_result);

        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                result.setText("clicked");
            }
        });
    }

    public static int add(int a, int b) {
        return a + b;
    }

    public static Date getCurrentDate() {
        return new Date();
    }

    public static Intent buildIntent(Context context, String key, String value) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(key, value);
        return intent;
    }
}
