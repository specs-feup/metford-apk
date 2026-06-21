package com.example.myapplication;

import android.content.Context;
import android.content.Intent;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Date;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MainActivityInstrumentedTest {

    // Killed by ArithmeticOperatorMutator (add→sub gives -1, add→mul gives 6)
    @Test
    public void add_returnsSum() {
        assertEquals(5, MainActivity.add(2, 3));
    }

    // Killed by InvalidDateMutator (new Date(10000) is Jan 1970 + 10s, far from now)
    @Test
    public void getCurrentDate_isRecent() {
        long before = System.currentTimeMillis();
        Date date = MainActivity.getCurrentDate();
        long after = System.currentTimeMillis();
        assertTrue("Date is before the test started", date.getTime() >= before);
        assertTrue("Date is after the test ended", date.getTime() <= after);
    }

    // Killed by NullIntentMutator (intent is null → NPE on hasExtra)
    // Killed by NullPutExtraKeyMutator (key becomes __metford_invalid_key__)
    @Test
    public void buildIntent_hasCorrectKey() {
        Context ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = MainActivity.buildIntent(ctx, "myKey", "myValue");
        assertNotNull("Intent is null", intent);
        assertTrue("Extra key not found", intent.hasExtra("myKey"));
    }

    // Killed by NullIntentMutator (intent is null → NPE on getStringExtra)
    // Killed by NullPutExtraValueMutator (value register set to null before putExtra)
    @Test
    public void buildIntent_hasCorrectValue() {
        Context ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = MainActivity.buildIntent(ctx, "myKey", "myValue");
        assertNotNull("Intent is null", intent);
        assertEquals("myValue", intent.getStringExtra("myKey"));
    }
}
